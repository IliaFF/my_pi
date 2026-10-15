#!/usr/bin/env node
// Explicit opt-in probe, not an installed extension or part of the default gate.
import './no-network.cjs';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { findPackageJSON } from 'node:module';
import { pathToFileURL } from 'node:url';

const [modulesArg, packageArg] = process.argv.slice(2);
assert.ok(modulesArg && packageArg, 'Usage: node --require ./scripts/no-network.cjs scripts/evaluate-subagents.mjs NODE_MODULES EXTRACTED_PACKAGE');
const modules = resolve(modulesArg), pkg = resolve(packageArg);
assert.equal(JSON.parse(readFileSync(join(pkg, 'package.json'))).version, '0.78.0');
const sdkPath = join(modules, '@earendil-works/pi-coding-agent/dist/index.js');
assert.equal(JSON.parse(readFileSync(join(modules, '@earendil-works/pi-coding-agent/package.json'))).version, '1.2.0');
const root = mkdtempSync(join(tmpdir(), 'pi-subagents-probe-'));
const envNames = ['PI_CODING_AGENT_DIR', 'HOME', 'USERPROFILE', 'XDG_CACHE_HOME', 'XDG_CONFIG_HOME', 'PI_SUBAGENTS_TEMP_ROOT'];
const previous = Object.fromEntries(envNames.map(k => [k, process.env[k]]));
for (const k of envNames) process.env[k] = join(root, k);
for (const k of envNames) mkdirSync(process.env[k], { recursive: true });
const report = { package: 'pi-subagents@0.78.0', sdk: '1.2.0', liveRequests: 0, checks: [], limitations: [
  'No live provider/cache/quality verification; foreground child lifecycle only, not detached runner ownership/wake.',
  'Node network guard is not an OS sandbox. No external subprocess network access is exercised.',
  'Permission wildcard is not supported; bash is intentionally outside package permission rules.',
] };
let session, emitShutdown, childFactory, nativeChild;
async function close() {
  if (!session) return;
  const current = session;
  session = undefined;
  try { await current.abort(); await emitShutdown(current.extensionRunner, { type: 'session_shutdown', reason: 'quit' }); }
  finally { current.dispose(); }
}
const deadline = setTimeout(() => { console.error('FAIL probe deadline'); process.exit(124); }, 90000);
try {
  const sdk = await import(pathToFileURL(sdkPath));
  ({ emitSessionShutdownEvent: emitShutdown } = await import(pathToFileURL(join(dirname(sdkPath), 'core/extensions/runner.js'))));
  const aiPath = join(dirname(findPackageJSON('@earendil-works/pi-ai', pathToFileURL(sdkPath))), 'dist/index.js');
  const { fauxProvider, fauxAssistantMessage, InMemoryCredentialStore } = await import(pathToFileURL(aiPath));
  const { default: childHooks } = await import(pathToFileURL(join(pkg, 'src/runs/shared/subagent-prompt-runtime.js')));
  const { validatePermissionRules } = await import(pathToFileURL(join(pkg, 'src/runs/shared/permissions.js')));
  const modelRuntime = await sdk.ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null, refreshOnCreate: false });
  const provider = fauxProvider({ provider: 'subagents-offline', api: 'faux', models: [{
    id: 'probe', name: 'Offline', reasoning: false, input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 64000, maxTokens: 512,
  }] });
  modelRuntime.registerNativeProvider(provider.provider);
  const extensionErrors = [];
  const plain = name => fauxAssistantMessage(name);
  let id = 0;
  const call = (name, args) => ({ ...plain(''), content: [{ type: 'toolCall', id: `call-${++id}`, name, arguments: args }], stopReason: 'toolUse' });
  async function open({ config, parent = false, tools = ['read', 'write', 'codemode'], codemode = true } = {}) {
    await close();
    const settingsManager = sdk.SettingsManager.inMemory({ packages: [], compaction: { enabled: false }, retry: { enabled: false } });
    const resourceLoader = new sdk.DefaultResourceLoader({ cwd: root, agentDir: process.env.PI_CODING_AGENT_DIR, settingsManager,
      noSkills: true, noPromptTemplates: true, noThemes: true, noExtensions: !parent,
      additionalExtensionPaths: parent ? [join(pkg, 'index.js')] : [],
      extensionFactories: parent ? [] : [
        { name: 'subagents-runtime-probe', factory: pi => childHooks(pi, { fanoutChild: false, depth: 1, maxDepth: 1, fast: false,
          waitTool: { enabled: false, defaultTimeoutMs: 1000 }, cwd: root, ...config }) },
        ...(codemode ? [sdk.createCodemodeExtension({ mode: 'on' })] : []),
      ],
    });
    await resourceLoader.reload();
    assert.deepEqual(resourceLoader.getExtensions().errors, []);
    ({ session } = await sdk.createAgentSession({ cwd: root, agentDir: process.env.PI_CODING_AGENT_DIR,
      modelRuntime, model: provider.getModel(), thinkingLevel: 'off', resourceLoader, settingsManager,
      sessionManager: sdk.SessionManager.inMemory(root), tools }));
    await session.bindExtensions({ onError: e => extensionErrors.push({ event: e.event, error: String(e.error) }) });
  }
  async function invoke(steps) {
    const results = [];
    const unsubscribe = session.subscribe(e => { if (e.type === 'tool_execution_end') results.push(e); });
    provider.setResponses([...steps, plain('PROBE_DONE')]);
    try { await session.prompt('Execute the offline fixture only.'); await session.waitForIdle(); }
    finally { unsubscribe(); }
    return results;
  }
  const text = r => JSON.stringify(r.result?.content ?? []);
  const record = (name, detail) => { report.checks.push({ name, status: 'PASS', ...detail }); console.log(`PASS ${name}${detail ? ' ' + JSON.stringify(detail) : ''}`); };
  writeFileSync(join(root, 'fixture.txt'), 'ORIGINAL');

  assert.throws(() => validatePermissionRules({ bash: 'deny' }, 'probe'), /unsupported/);
  record('bash deny is rejected explicitly, not treated as protection');

  await open({ config: { permissions: { rules: { write: 'deny' } } } });
  const denied = await invoke([call('write', { path: 'fixture.txt', content: 'MUTATED' })]);
  assert.equal(denied.length, 1); assert.equal(denied[0].isError, true); assert.match(text(denied[0]), /permission rule/);
  assert.equal(readFileSync(join(root, 'fixture.txt'), 'utf8'), 'ORIGINAL');
  record('direct write deny preserves file');

  const nestedDenied = await invoke([call('codemode', { code: "text(await tools.write({path:'fixture.txt',content:'MUTATED'}));" })]);
  assert.equal(readFileSync(join(root, 'fixture.txt'), 'utf8'), 'ORIGINAL');
  assert.ok(nestedDenied.some(r => r.toolName === 'write' && r.isError && /permission rule/.test(text(r))), JSON.stringify(nestedDenied));
  record('native codemode cannot bypass write deny');

  await open({ config: { toolBudget: { hard: 1, block: '*' } } });
  const budget = await invoke([call('read', { path: 'fixture.txt' }), call('read', { path: 'fixture.txt' })]);
  assert.equal(budget.length, 2); assert.equal(budget[0].isError, false); assert.equal(budget[1].isError, true);
  assert.match(text(budget[1]), /Tool budget hard limit/);
  record('hard wildcard budget blocks second direct read');

  await open({ config: { toolBudget: { hard: 2, block: '*' } } });
  const nestedBudget = await invoke([call('codemode', { code: "text(await tools.read({path:'fixture.txt'})); text(await tools.read({path:'fixture.txt'}));" })]);
  const reads = nestedBudget.filter(r => r.toolName === 'read');
  assert.equal(reads.length, 2, JSON.stringify(nestedBudget));
  assert.equal(reads[0].isError, false); assert.equal(reads[1].isError, true); assert.match(text(reads[1]), /Tool budget hard limit/);
  record('hard wildcard budget counts codemode and nested reads');

  await open({ tools: ['read'], codemode: false });
  const hidden = await invoke([call('write', { path: 'fixture.txt', content: 'MUTATED' })]);
  assert.equal(readFileSync(join(root, 'fixture.txt'), 'utf8'), 'ORIGINAL');
  assert.ok(hidden.some(r => r.isError), JSON.stringify(hidden));
  record('explicit read-only tool selection rejects direct write');

  await open({ tools: ['read', 'codemode'] });
  const hiddenNested = await invoke([call('codemode', { code: "text(await tools.write({path:'fixture.txt',content:'MUTATED'}));" })]);
  assert.equal(readFileSync(join(root, 'fixture.txt'), 'utf8'), 'ORIGINAL');
  assert.ok(hiddenNested.some(r => r.isError), JSON.stringify(hiddenNested));
  record('explicit read-only tool selection also rejects codemode write');

  let captured;
  const structured = { schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false },
    capture: value => { captured = value; } };
  await open({ config: { structuredOutput: structured }, tools: ['structured_output'], codemode: false });
  const invalid = await invoke([call('structured_output', { value: { ok: 'wrong' } })]);
  assert.ok(invalid.some(r => r.isError)); assert.equal(captured, undefined);
  const valid = await invoke([call('structured_output', { value: { ok: true } })]);
  assert.ok(valid.some(r => !r.isError)); assert.deepEqual(captured, { ok: true });
  record('structured output validates before capture');

  await open({ tools: ['bash'], codemode: false });
  let abortPromise;
  const unsubscribe = session.subscribe(e => {
    if (e.type === 'tool_execution_start' && e.toolName === 'bash') {
      setTimeout(() => { abortPromise = session.abort(); }, 100);
    }
  });
  await invoke([call('bash', { command: 'sleep 2; printf BAD > cancel-canary.txt', timeout: 5 })]);
  unsubscribe(); await abortPromise;
  await new Promise(r => setTimeout(r, 2200));
  assert.equal(existsSync(join(root, 'cancel-canary.txt')), false);
  record('SDK abort cancels a running bash before delayed file mutation');

  await close();
  const { createDefaultChildSessionFactory } = await import(pathToFileURL(join(pkg, 'src/runs/shared/child-session.js')));
  childFactory = createDefaultChildSessionFactory({ loadPiCodingAgent: async () => sdk });
  const nativeConfig = { fanoutChild: false, depth: 1, maxDepth: 1, fast: false, cwd: root,
    permissions: { rules: { write: 'deny' } }, toolBudget: { hard: 3, block: '*' },
    waitTool: { enabled: false, defaultTimeoutMs: 1000 } };
  const sessionFile = join(root, 'native-child.jsonl');
  const launch = { cwd: root, projectTrusted: false, parentProviderRegistry: modelRuntime,
    model: 'subagents-offline/probe', tools: ['read', 'write'], storage: { kind: 'file', sessionFile },
    extensionPaths: [], ambientExtensions: false, noSkills: true, noContextFiles: true,
    systemPrompt: 'Offline fixture only.', runtime: nativeConfig,
    hooks: [{ name: 'native-child-runtime', factory: pi => childHooks(pi, nativeConfig) }],
    onExtensionError: e => extensionErrors.push({ event: e.event, error: String(e.error) }) };
  nativeChild = await childFactory.create(launch);
  const nativeResults = [];
  nativeChild.subscribe(e => { if (e.type === 'tool_execution_end') nativeResults.push(e); });
  provider.setResponses([call('write', { path: 'fixture.txt', content: 'MUTATED' }), plain('NATIVE_CHILD_COMPLETE')]);
  await nativeChild.prompt('Run the denied write fixture, then finish.');
  assert.ok(nativeResults.some(r => r.toolName === 'write' && r.isError), JSON.stringify(nativeResults));
  assert.equal(readFileSync(join(root, 'fixture.txt'), 'utf8'), 'ORIGINAL');
  await nativeChild.dispose(); nativeChild = undefined;
  const firstSession = readFileSync(sessionFile, 'utf8');
  assert.match(firstSession, /NATIVE_CHILD_COMPLETE/);
  record('actual foreground child factory inherits faux provider, enforces deny, persists result');
  nativeChild = await childFactory.create(launch);
  provider.setResponses([plain('NATIVE_CHILD_RESUMED')]);
  await nativeChild.prompt('Resume the offline fixture.');
  await nativeChild.dispose(); nativeChild = undefined;
  const resumedSession = readFileSync(sessionFile, 'utf8');
  assert.match(resumedSession, /NATIVE_CHILD_COMPLETE/); assert.match(resumedSession, /NATIVE_CHILD_RESUMED/);
  await childFactory.dispose(); childFactory = undefined;
  record('actual foreground child resume preserves prior and new session results');

  const configDir = join(process.env.PI_CODING_AGENT_DIR, 'extensions/subagent'); mkdirSync(configDir, { recursive: true });
  writeFileSync(join(configDir, 'config.json'), JSON.stringify({ asyncByDefault: false, toolActivation: 'eager', fleetView: false,
    activeRunsPrompt: false, maxSubagentDepth: 1, maxSubagentSpawnsPerRun: 1, maxSubagentSpawnsPerSession: 1,
    defaultSubagentContext: 'fresh' }));
  const agentsDir = join(process.env.PI_CODING_AGENT_DIR, 'agents'); mkdirSync(agentsDir);
  writeFileSync(join(agentsDir, 'pilot-readonly.md'), '---\nname: pilot-readonly\ndescription: Offline bounded probe\nmodel: subagents-offline/probe\ntools: read\ncontext: fresh\nacceptanceRole: read-only\ninheritSkills: false\nsystemPromptMode: replace\n---\nRead only the assigned fixture and report. Never delegate or modify files.\n');
  await open({ parent: true, tools: ['subagent', 'bg_wait', 'subagent_supervisor', 'contact_supervisor'] });
  const active = session.getActiveToolNames();
  assert.ok(active.includes('subagent'));
  const status = await invoke([call('subagent', { action: 'status' })]);
  assert.ok(status.length === 1 && !status[0].isError, JSON.stringify(status));
  const declarations = session.agent.state.tools.map(({ name, description, parameters }) => ({ name, description, parameters }));
  record('actual parent extension loads on Pi 1.2 and status runs offline', {
    activeTools: active, declaredSchemaChars: JSON.stringify(declarations).length,
    subagentSchemaChars: JSON.stringify(declarations.find(t => t.name === 'subagent')).length,
    systemPromptChars: session.systemPrompt.length,
  });
  let defaultChildTools;
  const publicRun = await invoke([
    call('subagent', { agent: 'pilot-readonly', task: 'Read fixture.txt and finish.', async: false,
      options: { context: 'fresh', timeoutMs: 15000, toolBudget: { hard: 2, block: '*' } } }),
    context => {
      defaultChildTools = context.messages.filter(m => m.role === 'system').flatMap(m => m.toolsAdded || []).map(t => t.name);
      assert.ok(defaultChildTools.includes('read'));
      for (const name of ['write', 'edit', 'bash', 'subagent', 'codemode']) assert.ok(!defaultChildTools.includes(name), name);
      return call('read', { path: 'fixture.txt' });
    }, plain('PUBLIC_CHILD_COMPLETE'),
  ]);
  assert.ok(publicRun.some(r => r.toolName === 'subagent' && !r.isError && /PUBLIC_CHILD_COMPLETE/.test(JSON.stringify(r.result))), JSON.stringify(publicRun));
  record('public subagent tool completes actual foreground read-only child and returns output', { declaredChildTools: defaultChildTools });
  const missionFiles = readdirSync(join(process.env.PI_CODING_AGENT_DIR, 'missions'), { recursive: true }).sort();
  const quietConfig = JSON.parse(readFileSync(join(configDir, 'config.json')));
  quietConfig.intercomBridge = { mode: 'off' };
  quietConfig.missions = { enabled: false };
  writeFileSync(join(configDir, 'config.json'), JSON.stringify(quietConfig));
  await open({ parent: true, tools: ['subagent'] });
  let quietChildTools;
  const quietRun = await invoke([
    call('subagent', { agent: 'pilot-readonly', task: 'Read fixture.txt and finish.', async: false,
      options: { context: 'fresh', timeoutMs: 15000, mission: false, toolBudget: { hard: 2, block: '*' } } }),
    context => {
      quietChildTools = context.messages.filter(m => m.role === 'system').flatMap(m => m.toolsAdded || []).map(t => t.name);
      assert.deepEqual(quietChildTools, ['read']);
      return call('read', { path: 'fixture.txt' });
    }, plain('QUIET_CHILD_COMPLETE'),
  ]);
  assert.ok(quietRun.some(r => r.toolName === 'subagent' && !r.isError && /QUIET_CHILD_COMPLETE/.test(JSON.stringify(r.result))), JSON.stringify(quietRun));
  assert.deepEqual(readdirSync(join(process.env.PI_CODING_AGENT_DIR, 'missions'), { recursive: true }).sort(), missionFiles);
  assert.ok(!text(quietRun.find(r => r.toolName === 'subagent')).includes('Mission:'));
  record('quiet profile declares read only, no supervisor injection and no automatic mission', { declaredChildTools: quietChildTools });
  await close();
  assert.deepEqual(extensionErrors, []);
  report.status = 'PASS';
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = 'FAIL'; report.error = String(error?.stack ?? error);
  console.error(JSON.stringify(report, null, 2)); process.exitCode = 1;
} finally {
  try { await nativeChild?.dispose(); await childFactory?.dispose(); await close(); }
  finally {
    clearTimeout(deadline);
    for (const [k, value] of Object.entries(previous)) { if (value === undefined) delete process.env[k]; else process.env[k] = value; }
    rmSync(root, { recursive: true, force: true });
  }
}
