// Explicit offline probe; third-party candidates are not installed into the build.
import './no-network.cjs';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [kind, candidateArg] = process.argv.slice(2);
assert.ok(['herdr', 'durable'].includes(kind) && candidateArg,
  'Usage: node scripts/evaluate-long-lived-agents.mjs herdr|durable CANDIDATE_CHECKOUT');
const candidate = resolve(candidateArg);
const modules = resolve('npm/node_modules');
const core = join(modules, '@earendil-works/pi-coding-agent/dist');
const fixture = mkdtempSync(join(tmpdir(), `pi-${kind}-context-`));
const agentDir = join(fixture, 'agent');
mkdirSync(agentDir, { mode: 0o700 });
const saved = { ...process.env };
const managedEnv = ['HOME', 'PI_CODING_AGENT_DIR', 'HERDR_ENV', 'HERDR_SOCKET_PATH',
  'HERDR_PANE_ID', 'PI_SUBAGENT_AUTO_EXIT', 'PI_SUBAGENT_PERSISTENT', 'PI_SUBAGENT_NAME'];
process.env.HOME = fixture;
process.env.PI_CODING_AGENT_DIR = agentDir;
process.env.PI_SUBAGENT_NAME = 'offline-context-probe';
process.env.PI_SUBAGENT_AUTO_EXIT = '0';
process.env.PI_SUBAGENT_PERSISTENT = '1';
for (const key of ['HERDR_ENV', 'HERDR_SOCKET_PATH', 'HERDR_PANE_ID']) delete process.env[key];
let session;
let shutdown;
const errors = [];
const deadline = setTimeout(() => { console.error('FAIL offline context deadline'); process.exit(124); }, 45000);
try {
  const sdk = await import(pathToFileURL(join(core, 'index.js')));
  const { loadExtensions } = await import(pathToFileURL(join(core, 'core/extensions/loader.js')));
  ({ emitSessionShutdownEvent: shutdown } = await import(pathToFileURL(join(core, 'core/extensions/runner.js'))));
  const extension = kind === 'herdr'
    ? join(candidate, 'maestro/adapters/pi/child/subagent-done.ts')
    : join(candidate, 'src/extension.ts');
  const loaded = await loadExtensions([
    join(modules, 'context-fold/index.ts'),
    resolve('local-extensions/auto-ultra-compact/index.ts'),
    join(modules, '@spences10/pi-context/dist/index.js'),
    extension,
  ], fixture);
  assert.deepEqual(loaded.errors, [], 'Candidate must load with the current context extensions');
  assert.equal(loaded.extensions.filter(e => e.handlers.has('session_before_compact')).length, 1);
  const resourceLoader = {
    getExtensions: () => loaded, getSkills: () => ({ skills: [], diagnostics: [] }),
    getPrompts: () => ({ prompts: [], diagnostics: [] }), getThemes: () => ({ themes: [], diagnostics: [] }),
    getAgentsFiles: () => ({ agentsFiles: [] }), getSystemPrompt: () => 'Offline fixture',
    getSystemPromptSource: () => undefined, getAppendSystemPrompt: () => [], getAppendSystemPromptSources: () => [],
    extendResources() {}, async reload() {},
  };
  const runtime = await sdk.ModelRuntime.create({ authPath: join(agentDir, 'auth.json'),
    modelsPath: null, modelsStorePath: join(agentDir, 'models.json'),
    allowModelNetwork: false, refreshOnCreate: false });
  let modelCalls = 0;
  for (const name of ['stream', 'streamSimple', 'complete', 'completeSimple', 'getAuth']) {
    runtime[name] = () => { modelCalls++; throw new Error(`Unexpected model operation: ${name}`); };
  }
  const model = { id: 'offline', provider: 'offline', api: 'openai-completions', reasoning: false,
    input: ['text'], maxTokens: 10000, contextWindow: 200000,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } };
  const manager = sdk.SessionManager.create(fixture, join(fixture, 'sessions'));
  const contract = 'Goal: inspect fixture. Constraint: DO_NOT_DEPLOY. Progress: phase 1. Evidence: fixture only.';
  writeFileSync(join(fixture, 'TODO.md'), contract);
  manager.appendMessage({ role: 'user', content: 'Inspect fixture.\nDO_NOT_DEPLOY', timestamp: 0 });
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };
  const appendTurns = (cycle) => {
    for (let turn = 0; turn < 5; turn++) {
      manager.appendMessage({ role: 'user', content: `Cycle ${cycle} intent ${turn}`, timestamp: Date.now() });
      manager.appendMessage({ role: 'assistant', content: [{ type: 'text', text: 'x'.repeat(20000) }],
        api: model.api, provider: model.provider, model: model.id, stopReason: 'stop', usage, timestamp: Date.now() });
    }
  };
  appendTurns(1);
  ({ session } = await sdk.createAgentSession({ cwd: fixture, agentDir, model, modelRuntime: runtime,
    resourceLoader, sessionManager: manager,
    settingsManager: sdk.SettingsManager.inMemory({ packages: [], retry: { enabled: false },
      compaction: { enabled: true, reserveTokens: 12500, keepRecentTokens: 12000 } }) }));
  await session.bindExtensions({ onError: error => errors.push({ event: error.event, error: String(error.error) }) });
  assert.deepEqual(errors, [], 'Candidate session_start must not fail');
  const tools = session.getActiveToolNames();
  for (const tool of ['recall_folded', 'context_search', 'context_get']) assert.ok(tools.includes(tool), tool);
  for (const cycle of [1, 2]) {
    if (cycle === 2) appendTurns(cycle);
    const result = await session.compact();
    assert.match(result.summary, /deterministic seed index/);
    assert.match(result.summary, new RegExp(`Cycle ${cycle} intent`));
    assert.equal(session.isCompacting, false);
    const active = session.getActiveToolNames();
    for (const tool of ['recall_folded', 'context_search', 'context_get']) {
      assert.ok(active.includes(tool), `Context tool lost after compaction ${cycle}: ${tool}`);
    }
    assert.equal(modelCalls, 0);
    assert.equal(readFileSync(join(fixture, 'TODO.md'), 'utf8'), contract);
  }
  assert.equal(manager.getEntries().filter(e => e.type === 'compaction').length, 2);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ candidate: kind, sdk: JSON.parse(readFileSync(join(core, '../package.json'))).version,
    status: 'PASS', deterministicCompactions: 2, modelCalls, contextTools: tools.filter(t => /context_|recall|fold/.test(t)),
    scope: kind === 'herdr' ? 'child protocol + context stack, no Herdr pane launch'
      : 'parent extension + context stack only; Durable children do NOT inherit these extensions',
    limitation: 'Synthetic manual compaction is not autonomous multi-window execution or recovery of every constraint.' }));
} finally {
  clearTimeout(deadline);
  try {
    if (session) {
      await session.abort();
      if (shutdown) await shutdown(session.extensionRunner, { type: 'session_shutdown', reason: 'quit' });
      session.dispose();
    }
  } finally {
    for (const key of managedEnv) {
      if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
    }
    rmSync(fixture, { recursive: true, force: true });
  }
}
