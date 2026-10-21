#!/usr/bin/env node
// Real native session replacement; temporary persisted sessions and scripted faux provider only.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { findPackageJSON } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const source = process.cwd(), modules = resolve(process.argv[2]);
const sdkFile = join(modules, '@earendil-works/pi-coding-agent/dist/index.js');
const sdk = await import(pathToFileURL(sdkFile));
const aiDir = dirname(findPackageJSON('@earendil-works/pi-ai', pathToFileURL(sdkFile)));
const { fauxProvider, fauxAssistantMessage, InMemoryCredentialStore } = await import(pathToFileURL(join(aiDir, 'dist/index.js')));
const root = mkdtempSync(join(tmpdir(), 'pi-task-session-'));
const oldAgent = process.env.PI_CODING_AGENT_DIR, oldHome = process.env.HOME, oldOffline = process.env.PI_OFFLINE;
process.env.HOME = root; process.env.PI_OFFLINE = '1';
process.env.PI_CODING_AGENT_DIR = join(root, 'agent'); mkdirSync(process.env.PI_CODING_AGENT_DIR);
let runtime, cancel = false, switchGate, failCreation = false;
const errors = [], notifications = [], results = [];
try {
  const provider = fauxProvider({ provider: 'task-session-test', api: 'faux', models: [{ id: 'faux', name: 'Session test', reasoning: false, input: ['text', 'image'], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 64000, maxTokens: 512 }] });
  const modelRuntime = await sdk.ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null, refreshOnCreate: false }); modelRuntime.registerNativeProvider(provider.provider);
  const { default: bg } = await import(pathToFileURL(join(modules, 'pi-background-tasks/dist/extensions/background-tasks.js')));
  const settingsManager = sdk.SettingsManager.inMemory({ packages: [], compaction: { enabled: false }, retry: { enabled: false } });
  const factory = async ({ cwd, sessionManager, sessionStartEvent }) => {
    if (failCreation) throw new Error('Injected native replacement creation failure');
    const services = await sdk.createAgentSessionServices({ cwd, agentDir: process.env.PI_CODING_AGENT_DIR, modelRuntime, settingsManager,
      resourceLoaderOptions: { noSkills: true, noPromptTemplates: true, noThemes: true,
        additionalExtensionPaths: [join(source, 'local-extensions/task-session.ts'), join(source, 'local-extensions/todo-queue/index.ts')],
        extensionFactories: [bg, pi => { pi.on('session_before_switch', async () => { if (switchGate) await switchGate; return cancel ? { cancel: true } : undefined; }); }] } });
    assert.deepEqual(services.resourceLoader.getExtensions().errors, []);
    return { ...await sdk.createAgentSessionFromServices({ services, sessionManager, sessionStartEvent, model: provider.getModel(), thinkingLevel: 'off', tools: ['start_task_session', 'task_queue', 'bg_run', 'bg_status', 'bg_kill'] }), services, diagnostics: services.diagnostics };
  };
  runtime = await sdk.createAgentSessionRuntime(factory, { cwd: root, agentDir: process.env.PI_CODING_AGENT_DIR, sessionManager: sdk.SessionManager.create(root, join(root, 'sessions')) });
  const bind = async session => {
    await session.bindExtensions({ onError: e => errors.push(e), uiContext: { notify: (text, level) => notifications.push({ text, level }), setWidget: () => {}, setStatus: () => {} }, commandContextActions: {
      waitForIdle: () => session.waitForIdle(), newSession: options => runtime.newSession(options),
      switchSession: (path, options) => runtime.switchSession(path, options), fork: (id, options) => runtime.fork(id, options),
      reload: () => session.reload(), navigateTree: (id, options) => session.navigateTree(id, options),
    } });
    session.subscribe(e => { if (e.type === 'tool_execution_end') results.push(e); });
  };
  runtime.setRebindSession(bind); await bind(runtime.session);
  const message = text => fauxAssistantMessage(text);
  const tool = (name, args) => ({ ...message(''), content: [{ type: 'toolCall', id: `call-${results.length}`, name, arguments: args }], stopReason: 'toolUse' });
  const until = async predicate => { const end = Date.now() + 10000; while (!predicate()) { assert.ok(Date.now() < end, 'Native handoff deadline exceeded'); await new Promise(r => setTimeout(r, 20)); } };
  const prompt = async (text, responses, images) => { provider.setResponses(responses); await runtime.session.prompt(text, images ? { images } : undefined); await runtime.session.waitForIdle(); };
  const complete = id => tool('task_queue', { action: 'complete', id, summary: 'Fixture done', evidence: ['Offline scripted task; no code change'] });
  const original = runtime.session;
  await prompt('OLD_TASK_SENTINEL: explain the old project', [message('Old answer')]);
  assert.match(original.systemPrompt, /previous goal/);
  assert.match(original.systemPrompt, /Ask the user if uncertain/);
  await prompt('Clarify the old answer', [message('Related clarification')]);
  assert.equal(runtime.session, original, 'Related work must stay');
  await prompt('Potentially a new goal?', [message('Does this continue the previous goal?')]);
  assert.equal(runtime.session, original, 'Uncertainty must not switch');
  const beforeInvalid = original.messages.length;
  await original.prompt('/task-session-handoff invalid-token');
  assert.equal(original.messages.length, beforeInvalid); assert.equal(runtime.session, original);
  assert.match(notifications.at(-1).text, /No matching/);
  for (const task of ['   ', '/new']) {
    await prompt('Reject invalid handoff request', [tool('start_task_session', { task, reason: 'Independent' }), message('Rejected')]);
    assert.equal(results.at(-1).isError, true);
  }
  settingsManager.setProjectTrusted(false);
  await prompt('Reject untrusted handoff', [tool('start_task_session', { task: 'Independent task', reason: 'Independent' }), message('Rejected')]);
  assert.equal(results.at(-1).isError, true); settingsManager.setProjectTrusted(true);
  const handoff = original.agent.state.tools.find(t => t.name === 'start_task_session');
  await original.followUp('Queued correction');
  await assert.rejects(handoff.execute('pending-messages', { task: 'Independent', reason: 'Different goal' }, new AbortController().signal), /Messages are pending/);
  assert.deepEqual(original.getFollowUpMessages(), ['Queued correction']); original.clearQueue();
  let releaseSwitch; switchGate = new Promise(resolve => { releaseSwitch = resolve; }); cancel = true;
  const cancelledBefore = notifications.filter(n => /cancelled/.test(n.text)).length;
  const parallel = await Promise.allSettled([1, 2].map(n => handoff.execute(`parallel-${n}`, { task: 'Independent', reason: 'Different goal' }, new AbortController().signal)));
  assert.equal(parallel.filter(r => r.status === 'fulfilled').length, 1);
  assert.match(parallel.find(r => r.status === 'rejected').reason.message, /already pending/);
  releaseSwitch(); await until(() => notifications.filter(n => /cancelled/.test(n.text)).length > cancelledBefore);
  switchGate = undefined; cancel = false; assert.equal(runtime.session, original);
  const bgRun = original.agent.state.tools.find(t => t.name === 'bg_run');
  const bgKill = original.agent.state.tools.find(t => t.name === 'bg_kill');
  const background = await bgRun.execute('unfinished', { name: 'Unfinished work fixture', command: 'sleep 30', isAgent: false, timeoutSeconds: 40, triggerOnCompletion: false }, new AbortController().signal);
  await prompt('Do not abandon background work', [tool('start_task_session', { task: 'Independent task', reason: 'Different goal' }), message('Wait for background work')]);
  assert.equal(results.at(-1).isError, true); assert.match(JSON.stringify(results.at(-1).result), /Background work is unfinished/);
  await bgKill.execute('cleanup-unfinished', { taskId: background.details.task.id }, new AbortController().signal);
  const todo = join(root, 'TODO.md');
  const queue = '# TODO\n\n## In progress\n\n## Pending\n' + Array.from({ length: 4 }, (_, i) => `- [ ] Prior ${i + 1} <!-- pi-task:pre${i + 1} -->\n`).join('') + '- [ ] New unrelated task <!-- pi-task:new -->\n- [ ] After safety limit <!-- pi-task:after -->\n\n## Blocked\n\n## Completed\n';
  writeFileSync(todo, queue);
  provider.setResponses([message('I will assess the candidate first')]);
  await original.prompt('/queue next'); await original.waitForIdle();
  assert.equal(readFileSync(todo, 'utf8'), queue, 'Candidate assessment cannot pre-claim');
  assert.match(original.messages.filter(m => m.role === 'user').at(-1).content[0].text, /start_task_session/);
  const runFour = async () => {
    provider.setResponses([
      ...Array.from({ length: 4 }, (_, i) => [tool('task_queue', { action: 'claim', id: `pre${i + 1}` }), complete(`pre${i + 1}`), message(`Prior ${i + 1} finished`)]).flat(),
      message('Assess candidate new'),
    ]);
    await original.prompt('/queue run');
    await until(() => original.getLastAssistantText() === 'Assess candidate new'); await original.waitForIdle();
  };
  await runFour();
  await original.prompt('/queue resume'); // No current task: native command must pause without stale transferable auto-run.
  const pausedRun = original.sessionManager.getBranch().findLast(e => e.type === 'custom' && e.customType === 'todo-queue-run');
  assert.equal(pausedRun.data.autoRun, false, 'Failed resume must not leave stale transferable auto-run');
  writeFileSync(todo, queue); await runFour();
  const assessedQueue = readFileSync(todo, 'utf8');
  assert.match(assessedQueue, /## Pending\n- \[ \] New unrelated task/);
  cancel = true;
  await prompt('Unrelated goal, but cancel transition', [tool('start_task_session', { task: 'NEW_CANCELLED', reason: 'Independent goal' })]);
  await until(() => notifications.filter(n => /cancelled/.test(n.text)).length > cancelledBefore + 1);
  assert.equal(runtime.session, original); assert.equal(readFileSync(todo, 'utf8'), assessedQueue);
  cancel = false;
  const oldFile = original.sessionFile;
  const image = { type: 'image', mimeType: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC' };
  const { processImage } = await import(pathToFileURL(join(dirname(sdkFile), 'utils/image-process.js')));
  assert.equal((await processImage(Buffer.from(image.data, 'base64'), image.mimeType)).ok, true, 'Fixture image must be accepted before handoff');
  await prompt('Start the independent queued task', [
    tool('start_task_session', { task: 'NEW_TASK_SENTINEL: claim task new, then work', reason: 'Independent goal from old project' }),
    tool('start_task_session', { task: 'Loop', reason: 'Already in a fresh session' }),
    tool('task_queue', { action: 'claim', id: 'new' }), complete('new'), message('New task started'),
  ], [image]);
  await until(() => runtime.session !== original && runtime.session.getLastAssistantText() === 'New task started');
  await runtime.session.waitForIdle();
  assert.notEqual(runtime.session.sessionFile, oldFile); assert.ok(existsSync(oldFile));
  assert.ok(!JSON.stringify(runtime.session.messages).includes('OLD_TASK_SENTINEL'), 'Old context must not leak');
  assert.ok(JSON.stringify(runtime.session.messages).includes('NEW_TASK_SENTINEL'));
  assert.match(readFileSync(todo, 'utf8'), /- \[x\] New unrelated task/);
  assert.match(readFileSync(todo, 'utf8'), /## Pending\n- \[ \] After safety limit/);
  assert.ok(notifications.some(n => /safety limit 5/.test(n.text)), 'Auto-run budget must survive handoff');
  const freshUser = runtime.session.messages.find(m => m.role === 'user');
  assert.deepEqual(freshUser.content.find(p => p.type === 'image'), image, 'Current request attachment must survive');
  const runEntries = runtime.session.sessionManager.getBranch().filter(e => e.type === 'custom' && e.customType === 'todo-queue-run');
  assert.equal(runEntries[0].data.completedThisRun, 4);
  assert.equal(runEntries[0].data.handoff, true);
  assert.equal(runEntries[1].data.handoff, undefined, 'Handoff marker must be consumed');
  assert.ok(results.some(e => e.toolName === 'start_task_session' && !e.isError));
  assert.ok(results.some(e => e.toolName === 'start_task_session' && e.isError && /already fresh/.test(JSON.stringify(e.result))), 'First-task loop must be rejected');
  await runtime.session.reload();
  await runtime.session.prompt('/queue status');
  assert.match(notifications.at(-1).text, /Queue: PAUSED/, 'Reload must not reactivate a consumed handoff');
  writeFileSync(todo, queue.replace('## In progress\n', '## In progress\n- [ ] Busy <!-- pi-task:busy -->\n'));
  await prompt('Another independent task', [tool('start_task_session', { task: 'Another task', reason: 'Different goal' }), message('Ask before pausing')]);
  assert.equal(results.at(-1).isError, true);
  assert.deepEqual(errors, []);
  writeFileSync(todo, queue);
  const lastFile = runtime.session.sessionFile, lastTodo = readFileSync(todo, 'utf8');
  failCreation = true;
  await prompt('Independent task with failed native creation', [tool('start_task_session', { task: 'Creation will fail', reason: 'Different goal' })]);
  await until(() => errors.some(e => /Injected native replacement creation failure/.test(e.error)));
  assert.ok(existsSync(lastFile)); assert.equal(readFileSync(todo, 'utf8'), lastTodo);
  assert.equal(errors.length, 1, 'Exactly the injected native error must be surfaced without stale ctx reuse');
  await runtime.dispose(); runtime = undefined; failCreation = false;
  runtime = await sdk.createAgentSessionRuntime(factory, { cwd: root, agentDir: process.env.PI_CODING_AGENT_DIR, sessionManager: sdk.SessionManager.inMemory(root) });
  runtime.setRebindSession(bind); await bind(runtime.session);
  await prompt('Ephemeral first task', [message('First task done')]);
  await prompt('Independent ephemeral task', [tool('start_task_session', { task: 'Do not discard ephemeral history', reason: 'Different goal' }), message('Persist history first')]);
  assert.equal(results.at(-1).isError, true); assert.match(JSON.stringify(results.at(-1).result), /requires a persisted session/);
  assert.equal(errors.length, 1, JSON.stringify(errors));
  console.log('PASS native task-session SDK: related/uncertain stay, FIFO assessment, cancellation, fresh automatic execution/images, no old transcript, five-task budget across sessions, reload, TODO ownership and surfaced native creation failure');
} finally {
  await runtime?.dispose();
  if (oldAgent === undefined) delete process.env.PI_CODING_AGENT_DIR; else process.env.PI_CODING_AGENT_DIR = oldAgent;
  if (oldHome === undefined) delete process.env.HOME; else process.env.HOME = oldHome;
  if (oldOffline === undefined) delete process.env.PI_OFFLINE; else process.env.PI_OFFLINE = oldOffline;
  rmSync(root, { recursive: true, force: true });
}
