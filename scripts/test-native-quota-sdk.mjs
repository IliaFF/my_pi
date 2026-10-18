#!/usr/bin/env node
// Real SDK loader/runner and footer; only credential/HTTP boundaries are synthetic.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

const modules = resolve(process.argv[2]);
const core = join(modules, '@earendil-works/pi-coding-agent/dist');
const pkg = join(modules, '@beyona/pi-zai-usage/dist');
const root = mkdtempSync(join(tmpdir(), 'pi-native-quota-'));
const previous = { HOME: process.env.HOME, PI_CODING_AGENT_DIR: process.env.PI_CODING_AGENT_DIR };
process.env.HOME = root;
process.env.PI_CODING_AGENT_DIR = join(root, 'agent');
mkdirSync(process.env.PI_CODING_AGENT_DIR);
const originalFetch = globalThis.fetch;
const fixtures = [];
try {
  const { loadExtensions } = await import(pathToFileURL(join(core, 'core/extensions/loader.js')));
  const { ExtensionRunner } = await import(pathToFileURL(join(core, 'core/extensions/runner.js')));
  const { SessionManager } = await import(pathToFileURL(join(core, 'core/session-manager.js')));
  const native = { provider: 'openai', id: 'native-only', name: 'Native', baseUrl: 'https://api.openai.com/v1', contextWindow: 100000 };
  const codex = { provider: 'openai-codex', id: 'legacy-only', name: 'Codex', baseUrl: 'https://chatgpt.com/backend-api' };
  const payload = percent => ({ rate_limit: { primary_window: { used_percent: percent, limit_window_seconds: 18000, reset_after_seconds: 3600 } } });
  let requests = 0;
  let transport = async () => new Response(JSON.stringify(payload(23)));
  globalThis.fetch = async (url, init) => {
    requests++;
    assert.equal(url, 'https://chatgpt.com/backend-api/wham/usage');
    assert.equal(init.redirect, 'error', 'Never forward account credentials through a redirect');
    assert.match(new Headers(init.headers).get('authorization'), /^Bearer synthetic-codex(?:-other)?$/);
    return transport();
  };
  async function fixture({ model = native, credential = true, oauth = true, modelBase = codex.baseUrl, authBase = modelBase, brokenFirst = false, legacyPresent = true } = {}) {
    let selected = model, enabled = credential, token = 'synthetic-codex', footer, footerCalls = 0;
    const errors = [], lookups = [];
    const legacy = { ...codex, baseUrl: modelBase };
    const registry = {
      getAll: () => legacyPresent ? [native, legacy] : [native],
      getAvailable: () => !legacyPresent ? [native] : brokenFirst ? [{ ...legacy, id: 'broken' }, native, legacy] : [native, legacy],
      getApiKeyForProvider: async () => undefined,
      isUsingOAuth: m => m.provider === 'openai-codex' ? oauth && enabled : true,
      getApiKeyAndHeaders: async m => {
        lookups.push({ provider: m.provider, id: m.id });
        if (m.id === 'broken') throw new Error('Synthetic corrupt candidate');
        assert.equal(m.provider, 'openai-codex', 'Native credentials must never be read for quota');
        assert.equal(m.id, 'legacy-only', 'Use actual Codex model, not a relabeled native ID');
        return enabled ? { ok: true, apiKey: token, baseUrl: authBase } : { ok: false, error: 'missing' };
      },
    };
    const loaded = await loadExtensions([join(pkg, 'index.js')], root);
    assert.deepEqual(loaded.errors, []); assert.deepEqual(loaded.warnings, []);
    const runner = new ExtensionRunner(loaded.extensions, loaded.runtime, root, SessionManager.inMemory(root), registry);
    runner.bindCore({}, { getModel: () => selected, getScopedModels: () => [], isIdle: () => true, isProjectTrusted: () => true,
      getSignal: () => new AbortController().signal, getContextUsage: () => undefined });
    const theme = { fg: (_color, text) => text };
    runner.setUIContext({ theme, setFooter(builder) {
      footer?.dispose(); footerCalls++;
      footer = builder?.({ requestRender() {} }, theme, { onBranchChange: () => () => {}, getGitBranch: () => undefined, getExtensionStatuses: () => new Map() });
    }, notify() {} }, 'tui');
    runner.onError(error => errors.push(error));
    const item = { runner, errors, lookups, text: (width = 250) => stripVTControlCharacters(footer?.render(width).join('\n') ?? ''),
      changeAccount: () => { token = 'synthetic-codex-other'; },
      all: () => runner.getCommand('usage-details').handler('', runner.createContext()),
      calls: () => footerCalls, login: value => { enabled = value; },
      start: () => runner.emit({ type: 'session_start', reason: 'startup' }),
      select: async m => { const old = selected; selected = m; await runner.emit({ type: 'model_select', source: 'set', model: m, previousModel: old }); },
      stop: () => runner.emit({ type: 'session_shutdown' }) };
    fixtures.push(item); return item;
  }
  const active = await fixture();
  await active.start();
  assert.equal(requests, 1, 'Native model must fetch separate Codex quota despite disjoint IDs');
  assert.match(active.text(), /Codex account \(not native app\)/);
  assert.match(active.text(), /23/);
  assert.match(active.text(), /native-only/, 'Inference model is unchanged');
  for (const width of [20, 80, 250]) assert.ok(active.text(width).length > 0, `Footer renders at ${width}`);
  await active.all();
  assert.match(active.text(), /Codex account \(not native app\)/);
  await active.all();
  active.login(false);
  await active.select(native);
  assert.match(active.text(), /Codex account quota unavailable/);
  assert.doesNotMatch(active.text(), /23%/);
  active.login(true);
  await active.select({ ...native, id: 'native-codex-name' });
  assert.match(active.text(), /23/);
  await active.stop();

  for (const options of [{ legacyPresent: false }, { credential: false }, { oauth: false }, { modelBase: 'https://proxy.invalid/backend-api' }, { authBase: 'https://proxy.invalid' }, { modelBase: 'http://chatgpt.com/backend-api' }, { modelBase: 'https://user:pass@chatgpt.com/backend-api' }]) {
    const before = requests, f = await fixture(options); await f.start();
    assert.equal(requests, before, JSON.stringify(options));
    assert.match(f.text(), /Codex account quota unavailable/);
    await f.stop();
  }
  transport = async () => { throw new Error('Redirect rejected'); };
  const redirected = await fixture(); await redirected.start();
  assert.match(redirected.text(), /Codex account quota unavailable/); await redirected.stop();
  transport = async () => new Response('denied', { status: 401 });
  const denied = await fixture(); await denied.start();
  assert.match(denied.text(), /Codex account quota unavailable/);
  const deniedRequests = requests; await denied.select(native);
  assert.equal(requests, deniedRequests, 'Preserve failure backoff on native refresh');
  await denied.stop();

  for (const action of ['logout', 'account', 'switch', 'shutdown', 'all-shutdown']) {
    const started = Promise.withResolvers(), pending = Promise.withResolvers();
    transport = () => { started.resolve(); return pending.promise; };
    const f = await fixture(), loading = action === 'all-shutdown' ? f.all() : f.start();
    await started.promise;
    if (action === 'logout') f.login(false);
    if (action === 'account') f.changeAccount();
    if (action === 'switch') await f.select({ provider: 'other', id: 'other' });
    if (action === 'shutdown' || action === 'all-shutdown') await f.stop();
    const before = f.calls();
    pending.resolve(new Response(JSON.stringify(payload(88))));
    await loading;
    assert.doesNotMatch(f.text(), /88/);
    if (action === 'switch' || action === 'shutdown' || action === 'all-shutdown') assert.equal(f.calls(), before, 'Late response must not reinstall footer');
    await f.stop();
  }
  transport = async () => new Response(JSON.stringify(payload(23)));
  const recovered = await fixture({ brokenFirst: true }); await recovered.start();
  assert.match(recovered.text(), /23/); await recovered.stop();
  const legacy = await fixture({ model: codex }); await legacy.start();
  assert.match(legacy.text(), /23/); assert.doesNotMatch(legacy.text(), /not native app/); await legacy.stop();
  const unrelated = await fixture({ model: { provider: 'custom-openai', id: 'native-only' } });
  const before = requests; await unrelated.start(); assert.equal(requests, before); await unrelated.stop();
  for (const f of fixtures) {
    assert.deepEqual(f.errors, []);
    assert.ok(f.lookups.every(m => m.provider === 'openai-codex' && ['legacy-only', 'broken'].includes(m.id)), 'All auth lookups use actual Codex model identities');
  }
  console.log('PASS actual SDK native quota fallback, account label, unchanged inference, missing/unsafe OAuth, redirects/401, logout and late model/shutdown response, legacy and unrelated providers; synthetic auth/HTTP only.');
} finally {
  for (const f of fixtures) await f.stop();
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(previous)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  rmSync(root, { recursive: true, force: true });
}
