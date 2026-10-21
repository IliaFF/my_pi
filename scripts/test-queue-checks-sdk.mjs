// Actual native SDK nested calls and patched background shell package; no external providers.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { findPackageJSON } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const modules = resolve(process.argv[2]), root = mkdtempSync(join(tmpdir(), 'queue-check-sdk-'));
const workspace = join(root, 'workspace'); mkdirSync(workspace);
const saved = { ...process.env }, url = p => pathToFileURL(p).href;
let session, unsub;
try {
  process.env.HOME = root; process.env.PI_CODING_AGENT_DIR = join(root, 'agent'); process.env.PI_OFFLINE = '1';
  mkdirSync(process.env.PI_CODING_AGENT_DIR);
  const sdk = join(modules, '@earendil-works/pi-coding-agent');
  const { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } = await import(url(join(sdk, 'dist/index.js')));
  const ai = dirname(findPackageJSON('@earendil-works/pi-ai', url(join(sdk, 'dist/index.js'))));
  const { fauxProvider, fauxAssistantMessage, InMemoryCredentialStore } = await import(url(join(ai, 'dist/index.js')));
  const provider = fauxProvider({ provider: 'queue-check-offline', api: 'faux', models: [{ id: 'faux', name: 'Offline', reasoning: false, input: ['text'], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 64000, maxTokens: 512 }] });
  const modelRuntime = await ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null, refreshOnCreate: false }); modelRuntime.registerNativeProvider(provider.provider);
  const { default: bg } = await import(url(join(modules, 'pi-background-tasks/dist/extensions/background-tasks.js')));
  const terminal = new Map(), waiters = new Map(), continuations = new Set();
  const settingsManager = SettingsManager.inMemory({ compaction: { enabled: false }, retry: { enabled: false } });
  const resourceLoader = new DefaultResourceLoader({ cwd: workspace, agentDir: process.env.PI_CODING_AGENT_DIR, settingsManager, noSkills: true, noThemes: true, noPromptTemplates: true,
    additionalExtensionPaths: [resolve('local-extensions/todo-queue/index.ts')], extensionFactories: [bg, pi => {
      unsub = pi.events.on('pi-background-tasks:terminal:v1', e => {
        provider.appendResponses([fauxAssistantMessage(`Check continuation ${e.task.id}`)]);
        terminal.set(e.task.id, e.task); waiters.get(e.task.id)?.(e.task);
      });
    }] });
  await resourceLoader.reload(); assert.deepEqual(resourceLoader.getExtensions().errors, []);
  ({ session } = await createAgentSession({ cwd: workspace, agentDir: process.env.PI_CODING_AGENT_DIR, modelRuntime, model: provider.getModel(), resourceLoader, settingsManager, sessionManager: SessionManager.inMemory(workspace), tools: ['task_queue', 'bg_run', 'bg_status'] }));
  const errors = []; await session.bindExtensions({ onError: e => errors.push(e) });
  const todo = join(workspace, 'TODO.md'), src = join(workspace, 'source.txt');
  writeFileSync(todo, '# TODO\n\n## In progress\n- [ ] Implement <!-- pi-task:task -->\n\n## Pending\n\n## Completed\n'); writeFileSync(src, 'v1');
  let last;
  session.subscribe(e => {
    if (e.type === 'tool_execution_end' && e.toolName === 'task_queue') last = e;
    if (e.type === 'message_end' && e.message.role === 'assistant') {
      for (const part of e.message.content) if (part.type === 'text' && part.text.startsWith('Check continuation ')) {
        const id = part.text.slice('Check continuation '.length);
        assert.ok(!continuations.has(id), 'Completion must not be duplicated'); continuations.add(id);
      }
    }
  });
  const invoke = async args => {
    last = undefined;
    provider.setResponses([{ ...fauxAssistantMessage(''), content: [{ type: 'toolCall', id: `check-${Date.now()}`, name: 'task_queue', arguments: args }], stopReason: 'toolUse' }, fauxAssistantMessage('Finished')]);
    await session.prompt('Offline check'); await session.waitForIdle(); assert.ok(last); return last;
  };
  const wait = async id => {
    const task = terminal.get(id) ?? await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Job deadline exceeded')), 10000); waiters.set(id, value => { clearTimeout(timer); waiters.delete(id); resolve(value); }); });
    const deadline = Date.now() + 10000;
    while (!continuations.has(id) || session.isStreaming) {
      assert.ok(Date.now() < deadline, `Native completion did not resume for ${id}`);
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    await session.waitForIdle(); return task;
  };
  const complete = () => invoke({ action: 'complete', id: 'task', summary: 'Done', evidence: ['Recorded checks'] });
  const start = async command => { const r = await invoke({ action: 'check', id: 'task', command, timeoutSeconds: 5 }); assert.equal(r.isError, false, JSON.stringify(r.result)); return r.result.details.check; };
  const command = `${JSON.stringify(process.execPath)} -e 'setTimeout(() => process.exit(0), 1500)'`;
  const first = await start(command), original = readFileSync(todo, 'utf8');
  const statusTool = session.agent.state.tools.find(t => t.name === 'bg_status');
  const status = await statusTool.execute('check-wake', { taskId: first.jobId }, new AbortController().signal);
  assert.equal(status.details.tasks[0].triggerOnCompletion, true, 'Recorded checks must enable native completion wake');
  assert.equal((await complete()).isError, true, 'Running job must not complete task'); assert.equal(readFileSync(todo, 'utf8'), original);
  writeFileSync(src, 'edited while running');
  await wait(first.jobId);
  const inspected = await invoke({ action: 'checks', id: 'task' }); assert.equal(inspected.result.details.checks[0].exitCode, 0);
  assert.equal((await complete()).isError, true, 'Edit during check invalidates result');
  const fresh = await start(command); await wait(fresh.jobId); await invoke({ action: 'checks', id: 'task' });
  writeFileSync(src, 'v2'); assert.equal((await complete()).isError, true, 'Edit after completion invalidates check'); assert.equal(readFileSync(todo, 'utf8'), original);
  const rerun = await start(command); await wait(rerun.jobId);
  const failure = await start(`${JSON.stringify(process.execPath)} -e 'console.log("PASS"); process.exit(7)'`); await wait(failure.jobId);
  assert.equal((await complete()).isError, true, 'Printed PASS cannot override exit 7');
  // A different command cannot erase a required failed check; edit the script, not the check identity.
  const failScript = join(workspace, 'check.cjs'); writeFileSync(failScript, 'process.exit(1)');
  const scriptCommand = `${JSON.stringify(process.execPath)} check.cjs`;
  const bad = await start(scriptCommand); await wait(bad.jobId); writeFileSync(failScript, 'process.exit(0)');
  const good = await start(scriptCommand); await wait(good.jobId);
  assert.equal((await complete()).isError, true, 'Other stale/failed commands still required');
  // An archived active spec can be replaced explicitly, but never by hiding a failed check.
  writeFileSync(todo, original.replace('pi-task:task', 'pi-task:archive'));
  const archiveTodo = readFileSync(todo, 'utf8'), activeSpec = join(workspace, 'active-change.md');
  writeFileSync(activeSpec, 'active specification');
  const otherScope = join(workspace, 'other-check-scope'); mkdirSync(otherScope);
  const archiveCheck = async command => {
    const r = await invoke({ action: 'check', id: 'archive', command, timeoutSeconds: 5 });
    assert.equal(r.isError, false, JSON.stringify(r.result));
    await wait(r.result.details.check.jobId);
    await invoke({ action: 'checks', id: 'archive' });
    return r.result.details.check;
  };
  const preArchive = await archiveCheck(`${JSON.stringify(process.execPath)} -e 'require("node:fs").accessSync("active-change.md")'`);
  rmSync(activeSpec);
  writeFileSync(failScript, 'process.exit(1)');
  const archiveFailure = await archiveCheck(scriptCommand);
  const finalCommand = `${JSON.stringify(process.execPath)} -e 'process.exit(0)'`;
  const finalBeforeFix = await archiveCheck(finalCommand);
  const replace = (checkId, replacementId, reason = 'Active spec archived; final suite validates archived specs') =>
    invoke({ action: 'supersede', id: 'archive', checkId, replacementId, reason });
  assert.equal((await replace(archiveFailure.id, finalBeforeFix.id)).isError, true, 'Must not hide failed command');
  writeFileSync(failScript, 'process.exit(0)');
  const archiveRerun = await archiveCheck(scriptCommand);
  assert.equal((await replace(preArchive.id, finalBeforeFix.id)).isError, true, 'Replacement snapshot is stale');
  const finalArchive = await archiveCheck(finalCommand);
  const other = await invoke({ action: 'check', id: 'archive', command: finalCommand, cwd: otherScope, timeoutSeconds: 5 });
  assert.equal(other.isError, false); await wait(other.result.details.check.jobId);
  await invoke({ action: 'checks', id: 'archive' });
  const jobsBeforeReplacement = terminal.size;
  for (const args of [[preArchive.id, finalArchive.id, ' '], ['missing', finalArchive.id],
    [first.id, finalArchive.id], [preArchive.id, 'missing'], [preArchive.id, preArchive.id],
    [preArchive.id, other.result.details.check.id]]) {
    assert.equal((await replace(...args)).isError, true);
    assert.equal(readFileSync(todo, 'utf8'), archiveTodo, 'Invalid supersession must not mutate TODO');
  }
  const beforeSupersede = await invoke({ action: 'complete', id: 'archive', summary: 'Done', evidence: ['final suite'] });
  assert.equal(beforeSupersede.isError, true, 'New command alone cannot erase stale active-spec requirement');
  assert.ok(!session.sessionManager.getBranch().some(e => e.type === 'custom' && e.customType === 'todo-queue-check-v1' && e.data.supersededBy), 'Invalid attempts must not append supersession');
  const validReplacement = await replace(preArchive.id, finalArchive.id);
  assert.equal(validReplacement.isError, false, JSON.stringify(validReplacement.result));
  assert.equal(terminal.size, jobsBeforeReplacement, 'Supersession must not launch another shell job');
  assert.equal(readFileSync(todo, 'utf8'), archiveTodo, 'Successful supersession must not mutate TODO');
  const archiveRecords = (await invoke({ action: 'checks', id: 'archive' })).result.details.checks;
  assert.equal(archiveRecords.find(r => r.id === preArchive.id).supersededBy, finalArchive.id);
  assert.ok(archiveRecords.some(r => r.id === archiveFailure.id && r.exitCode === 1), 'Failure history remains');
  assert.ok(archiveRecords.some(r => r.id === archiveRerun.id && r.exitCode === 0), 'Same-command rerun remains');
  const ledger = session.sessionManager.getBranch().filter(e => e.type === 'custom' && e.customType === 'todo-queue-check-v1');
  assert.ok(ledger.some(e => e.data.id === preArchive.id && !e.data.supersededBy), 'Original successful evidence remains in append-only history');
  assert.ok(ledger.some(e => e.data.id === preArchive.id && e.data.supersededReason), 'Reason is persisted');
  assert.equal((await invoke({ action: 'complete', id: 'archive', summary: 'Done', evidence: ['explicit archive replacement'] })).isError, false);

  // A fresh task exercises successful completion without importing prior lifecycle evidence.
  writeFileSync(todo, original.replace('pi-task:task', 'pi-task:next'));
  const next = await invoke({ action: 'check', id: 'next', command: scriptCommand, timeoutSeconds: 5 }); assert.equal(next.isError, false); await wait(next.result.details.check.jobId);
  assert.equal((await invoke({ action: 'complete', id: 'task', summary: 'Done', evidence: ['wrong id'] })).isError, true);
  assert.equal((await invoke({ action: 'release', id: 'next' })).isError, false);
  assert.equal((await invoke({ action: 'claim', id: 'next' })).isError, false);
  assert.equal((await invoke({ action: 'complete', id: 'next', summary: 'Done', evidence: ['old lifecycle'] })).isError, true);
  const resumed = await invoke({ action: 'check', id: 'next', command: scriptCommand, timeoutSeconds: 5 }); assert.equal(resumed.isError, false); await wait(resumed.result.details.check.jobId);
  const done = await invoke({ action: 'complete', id: 'next', summary: 'Done', evidence: ['Real native check'] }); assert.equal(done.isError, false, JSON.stringify(done.result));
  assert.match(readFileSync(todo, 'utf8'), /- \[x\] Implement/);
  writeFileSync(todo, original.replace('pi-task:task', 'pi-task:timeout'));
  const timeout = await invoke({ action: 'check', id: 'timeout', command: `${JSON.stringify(process.execPath)} -e 'setInterval(() => {}, 1000)'`, timeoutSeconds: 1 });
  assert.equal(timeout.isError, false);
  const timed = await wait(timeout.result.details.check.jobId); assert.equal(timed.status, 'failed'); assert.match(timed.error, /timed out/i);
  const wakesBeforeInspection = continuations.size;
  assert.equal((await invoke({ action: 'complete', id: 'timeout', summary: 'Done', evidence: ['Timeout is not success'] })).isError, true);
  await invoke({ action: 'checks', id: 'timeout' }); assert.equal(continuations.size, wakesBeforeInspection);
  assert.deepEqual(errors, []);
  console.log('PASS actual queue/background SDK: snapshots, ownership, native completion wake on success/failure/timeout and no duplicate inspection wake');
} finally {
  unsub?.(); if (session) { try { await session._extensionRunner.emit({ type: 'session_shutdown', reason: 'quit' }); } catch {} session.dispose(); }
  for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key]; Object.assign(process.env, saved);
  process.once('beforeExit', () => rmSync(root, { recursive: true, force: true }));
}
