#!/usr/bin/env node
// Real Pi SDK and pi-subagents, synthetic native provider; no credentials or transport.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, symlinkSync, rmSync } from 'node:fs';
import { findPackageJSON } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const source = process.cwd(), modules = resolve(process.argv[2]);
const sdkFile = join(modules, '@earendil-works/pi-coding-agent/dist/index.js');
const sdk = await import(pathToFileURL(sdkFile));
const ai = dirname(findPackageJSON('@earendil-works/pi-ai', pathToFileURL(sdkFile)));
const { fauxProvider, fauxAssistantMessage, InMemoryCredentialStore } = await import(pathToFileURL(join(ai, 'dist/index.js')));
const root = mkdtempSync(join(tmpdir(), 'pi-terminal-sdk-'));
const previous = { HOME: process.env.HOME, PI_CODING_AGENT_DIR: process.env.PI_CODING_AGENT_DIR,
  PI_SUBAGENTS_PI_CODING_AGENT_PACKAGE_ROOT: process.env.PI_SUBAGENTS_PI_CODING_AGENT_PACKAGE_ROOT,
  PI_BG_DISABLE_UPDATE_CHECK: process.env.PI_BG_DISABLE_UPDATE_CHECK };
const agent = join(root, 'agent'), cwd = join(root, 'project');
mkdirSync(agent); mkdirSync(cwd); mkdirSync(join(agent, 'npm'));
symlinkSync(modules, join(agent, 'npm/node_modules'));
process.env.HOME = root; process.env.PI_CODING_AGENT_DIR = agent;
process.env.PI_BG_DISABLE_UPDATE_CHECK = '1';
process.env.PI_SUBAGENTS_PI_CODING_AGENT_PACKAGE_ROOT = dirname(dirname(sdkFile));
const baseline = JSON.parse(readFileSync(join(source, 'configs/settings.json')));
const packageEntry = baseline.packages.find(item => item.source === 'npm:pi-subagents@0.87.0');
writeFileSync(join(agent, 'settings.json'), JSON.stringify({ packages: [packageEntry], subagents: baseline.subagents,
  defaultProvider: 'openrouter', defaultModel: 'deepseek/deepseek-v4.1-flash-1017', retry: { enabled: false }, compaction: { enabled: false } }));
cpSync(join(source, 'configs/agents'), join(agent, 'agents'), { recursive: true });
mkdirSync(join(agent, 'extensions/subagent'), { recursive: true });
cpSync(join(source, 'configs/subagent/config.json'), join(agent, 'extensions/subagent/config.json'));
writeFileSync(join(agent, 'AGENTS.md'), 'GLOBAL_TERMINAL_CONTEXT: Preserve unrelated work.\n');
writeFileSync(join(cwd, 'AGENTS.md'), 'PROJECT_TERMINAL_CONTEXT: Run only the assigned checks.\n');
mkdirSync(join(agent, 'skills/terminal-fixture'), { recursive: true });
writeFileSync(join(agent, 'skills/terminal-fixture/SKILL.md'), '---\nname: terminal-fixture\ndescription: TERMINAL_SKILL_CONTEXT\n---\nFixture only.\n');
let session, continued;
const errors = [];
try {
  const provider = fauxProvider({ provider: 'openrouter', api: 'faux', models: [{ id: 'deepseek/deepseek-v4.1-flash-1017', name: 'Offline terminal fixture', reasoning: false, input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 64000, maxTokens: 512 }], tokensPerSecond: 2000 });
  const modelRuntime = await sdk.ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null, refreshOnCreate: false });
  modelRuntime.registerNativeProvider(provider.provider);
  const settingsManager = sdk.SettingsManager.create(cwd, agent);
  settingsManager.setProjectTrusted(true);
  const { default: bg } = await import(pathToFileURL(join(modules, 'pi-background-tasks/dist/extensions/background-tasks.js')));
  const loader = new sdk.DefaultResourceLoader({ cwd, agentDir: agent, settingsManager,
    noSkills: true, noPromptTemplates: true, noThemes: true, extensionFactories: [bg] });
  await loader.reload();
  assert.deepEqual(loader.getExtensions().errors, []);
  ({ session } = await sdk.createAgentSession({ cwd, agentDir: agent, modelRuntime, settingsManager,
    resourceLoader: loader, sessionManager: sdk.SessionManager.create(cwd, join(root, 'sessions')), model: provider.getModel(), thinkingLevel: 'off' }));
  await session.bindExtensions({ onError: error => errors.push(error) });
  const names = session.getActiveToolNames();
  assert.ok(names.includes('bg_run') && names.includes('subagent'), JSON.stringify(names));
  const tool = session.agent.state.tools.find(item => item.name === 'subagent');
  const call = (args, signal = new AbortController().signal) => tool.execute('terminal-fixture', args, signal);
  const listed = await call({ action: 'list', options: { capabilities: true } });
  assert.deepEqual(listed.details.agentCapabilities.agents.map(item => item.name), ['terminal']);
  provider.setResponses([context => {
    const transcript = JSON.stringify(context.messages);
    assert.match(transcript, /GLOBAL_TERMINAL_CONTEXT/);
    assert.match(transcript, /PROJECT_TERMINAL_CONTEXT/);
    assert.match(transcript, /TERMINAL_SKILL_CONTEXT/);
    return fauxAssistantMessage('TERMINAL_RESULT_SENTINEL commands: printf test; exitCode: 0');
  }]);
  const result = await call({ agent: 'terminal', task: 'Goal: report fixture. Cwd: assigned. Constraints: no writes. Done: return sentinel.', cwd, async: false });
  assert.match(JSON.stringify(result), /TERMINAL_RESULT_SENTINEL/);
  assert.notEqual(result.isError, true);
  const child = result.details.results[0];
  assert.equal(child.launchResolvedExtensions.disableAmbientExtensions, true);
  assert.deepEqual(child.capabilityAudit.ceiling.allowedAgents, []);
  assert.deepEqual(child.capabilityAudit.effectiveTools.sort(), ['bash', 'read']);
  assert.equal(child.acceptance.status, 'not-required');
  assert.equal(child.model, 'openrouter/deepseek/deepseek-v4.1-flash-1017');
  const calls = provider.state.callCount;
  await assert.rejects(call({ agent: 'terminal', task: 'wrong model must fail', async: false, model: 'openai/gpt-6.1-sol' }), /model|scope|allowed/i);
  assert.equal(provider.state.callCount, calls);
  await assert.rejects(call({ tasks: [{ agent: 'terminal', task: 'one' }, { agent: 'terminal', task: 'two' }], async: false }), /budget|fan.?out|spawn|limit/i);
  assert.equal(provider.state.callCount, calls);

  // Reopen the actual package-created file in Pi SDK; no detached/live provider.
  const continuationSettings = sdk.SettingsManager.inMemory({ retry: { enabled: false }, compaction: { enabled: false, keepRecentTokens: 16, reserveTokens: 512 } });
  const continuationLoader = new sdk.DefaultResourceLoader({ cwd, agentDir: agent, settingsManager: continuationSettings,
    noExtensions: true, noSkills: true, noPromptTemplates: true, noThemes: true });
  await continuationLoader.reload();
  ({ session: continued } = await sdk.createAgentSession({ cwd, agentDir: agent, modelRuntime, settingsManager: continuationSettings,
    resourceLoader: continuationLoader, sessionManager: sdk.SessionManager.open(child.sessionFile), model: provider.getModel(), thinkingLevel: 'off',
    tools: ['read', 'bash'] }));
  provider.setResponses([context => {
    assert.match(JSON.stringify(context.messages), /TERMINAL_RESULT_SENTINEL/);
    return fauxAssistantMessage('CONTINUED_RESULT_SENTINEL');
  }]);
  await continued.prompt('Continue the same fixture goal; return a checkpoint.');
  assert.match(continued.getLastAssistantText(), /CONTINUED_RESULT_SENTINEL/);
  provider.setResponses([fauxAssistantMessage('## Goal\nContinue the same terminal fixture.\n## Progress\nTERMINAL_CHECKPOINT_SENTINEL: first and second turns complete; no tool calls.\n## Next\nReturn final fixture result.')]);
  await continued.compact('Keep the terminal fixture checkpoint and constraints.');
  provider.setResponses([context => {
    assert.match(JSON.stringify(context.messages), /TERMINAL_CHECKPOINT_SENTINEL/);
    return fauxAssistantMessage('AFTER_COMPACTION_SENTINEL');
  }]);
  await continued.prompt('Continue from the checkpoint.');
  assert.match(continued.getLastAssistantText(), /AFTER_COMPACTION_SENTINEL/);
  const controller = new AbortController();
  let start;
  const started = new Promise(resolve => { start = resolve; });
  provider.setResponses([() => { start(); return fauxAssistantMessage('cancel fixture '.repeat(1000)); }]);
  const cancellation = call({ agent: 'terminal', task: 'Goal: cancellable fixture; no tools.', async: false }, controller.signal);
  const rejected = assert.rejects(cancellation, /aborted|cancelled/i);
  await started; controller.abort();
  await rejected;
  assert.deepEqual(errors, []);
  console.log('PASS terminal SDK: child/result, persisted-session continuation and compaction checkpoint, cancellation, AGENTS/skills inheritance, exact tools, no recursion, model/fanout ceilings and background co-loading');
} finally {
  continued?.dispose();
  if (session) { await session.extensionRunner.emit({ type: 'session_shutdown', reason: 'quit' }); session.dispose(); }
  for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  rmSync(root, { recursive: true, force: true });
}
