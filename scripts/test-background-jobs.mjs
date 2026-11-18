#!/usr/bin/env node
// Real SDK/package hooks and local child processes; faux provider only, no credentials or external model calls.
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { findPackageJSON } from "node:module";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const modules = resolve(process.argv[2]);
const root = mkdtempSync(join(tmpdir(), "pi-bg-sdk-"));
const savedEnv = { ...process.env }, oldFetch = globalThis.fetch;
const pids = new Set(), errors = [];
let session, bus, releaseBusy, network = 0, modelTurns = 0, expectedTurns = 0, expectedRuns = 0;
const sdkDir = join(modules, "@earendil-works/pi-coding-agent");
const pkg = join(modules, "pi-background-tasks");
const url = path => pathToFileURL(path).href;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async fn => { const end = Date.now() + 10000; while (Date.now() < end) { const v = await fn(); if (v) return v; await sleep(40); } throw new Error("Background test deadline exceeded"); };
const alive = pid => { try { return readFileSync(`/proc/${pid}/stat`, "utf8").split(") ")[1][0] !== "Z"; } catch { return false; } };
const node = code => `${JSON.stringify(process.execPath)} -e ${JSON.stringify(code)}`;
try {
  process.env.HOME = root;
  process.env.PI_CODING_AGENT_DIR = join(root, "agent");
  delete process.env.PI_BG_FEATURES;
  process.env.PI_OFFLINE = "1";
  globalThis.fetch = async () => { network++; throw new Error("Network forbidden in background pilot"); };
  const { parseBackgroundTasksConfig } = await import(url(join(pkg, "dist/src/core/config.js")));
  assert.deepEqual(parseBackgroundTasksConfig({}).features, { process: true, delegate: false, fusion: false, attested: false, attribution: false });
  assert.throws(() => parseBackgroundTasksConfig({ PI_BG_FEATURES: "process,delegate" }));
  const { default: subject } = await import(url(join(pkg, "dist/extensions/background-tasks.js")));
  const { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } = await import(url(join(sdkDir, "dist/index.js")));
  const { emitSessionShutdownEvent } = await import(url(join(sdkDir, "dist/core/extensions/runner.js")));
  const ai = dirname(findPackageJSON("@earendil-works/pi-ai", url(join(sdkDir, "dist/index.js"))));
  const { fauxProvider, fauxAssistantMessage, InMemoryCredentialStore } = await import(url(join(ai, "dist/index.js")));
  const cwd = join(root, "workspace"), agentDir = process.env.PI_CODING_AGENT_DIR;
  mkdirSync(cwd); mkdirSync(agentDir);
  const provider = fauxProvider({ provider: "background-offline", api: "faux", models: [{ id: "faux", name: "Offline", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 32000, maxTokens: 1024 }] });
  const modelRuntime = await ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null, refreshOnCreate: false });
  modelRuntime.registerNativeProvider(provider.provider);
  const settingsManager = SettingsManager.inMemory({ compaction: { enabled: false }, retry: { enabled: false }, defaultTools: [] });
  const manager = SessionManager.inMemory(cwd);
  const create = async () => {
    const loader = new DefaultResourceLoader({ cwd, agentDir, settingsManager, noSkills: true, noThemes: true, noPromptTemplates: true, systemPrompt: "Offline background pilot", extensionFactories: [subject, pi => { bus = pi.events; }] });
    await loader.reload(); assert.deepEqual(loader.getExtensions().errors, []);
    ({ session } = await createAgentSession({ cwd, agentDir, modelRuntime, model: provider.getModel(), settingsManager, resourceLoader: loader, sessionManager: manager, noTools: true }));
    await session.bindExtensions({ onError: e => errors.push(e) });
    session.subscribe(e => { if (e.type === "agent_start") modelTurns++; });
    session.setActiveToolsByName(["bg_run", "bg_status", "bg_logs", "bg_kill"]);
    assert.deepEqual(session.getAllTools().filter(t => t.name.startsWith("bg_") || t.name.startsWith("fusion_")).map(t => t.name).sort(), ["bg_kill", "bg_logs", "bg_run", "bg_status"]);
  };
  await create();
  const call = (name, args) => session.agent.state.tools.find(t => t.name === name).execute("pilot", args, new AbortController().signal);
  const run = async (command, extra = {}) => { const r = await call("bg_run", { name: "Offline pilot job", command, isAgent: false, ...extra }); if (r.details.task.pid) pids.add(r.details.task.pid); return r.details.task; };
  const status = async id => (await call("bg_status", { taskId: id })).details.tasks[0];
  const terminal = id => until(async () => { const t = await status(id); return t.status !== "running" && t; });
  const request = async (operation, payload) => {
    const id = `pilot-${Math.random()}`;
    let response;
    const unsub = bus.on("pi-background-tasks:response:v1", r => { if (r.request_id === id) response = r; });
    try { bus.emit("pi-background-tasks:request:v1", { schema_version: "pi-background-tasks.extension-request.v1", request_id: id, operation, payload }); return await until(() => response); } finally { unsub(); }
  };
  const nextWake = (newRun = true) => { expectedTurns++; if (newRun) expectedRuns++; provider.appendResponses([fauxAssistantMessage("Offline completion")]); };
  const woke = async task => {
    const done = await terminal(task.id);
    await until(() => modelTurns === expectedRuns && provider.state.callCount === expectedTurns && !session.isStreaming);
    await session.waitForIdle();
    await status(task.id); await call("bg_logs", { taskId: task.id, maxBytes: 256 });
    assert.equal(modelTurns, expectedRuns); assert.equal(provider.getPendingResponseCount(), 0);
    return done;
  };
  for (const triggerOnCompletion of [undefined, true]) for (const exit of [0, 7]) {
    nextWake();
    const task = await run(`printf 'completion-wake\\n'; exit ${exit}`, { triggerOnCompletion });
    assert.equal(task.triggerOnCompletion, true); assert.equal((await woke(task)).exitCode, exit);
  }
  const taskCount = (await call("bg_status", {})).details.tasks.length;
  for (const forbidden of [{ isAgent: true }, { triggerOnCompletion: true, notifyOnCompletion: false }, ...["yes", 1].map(triggerOnCompletion => ({ triggerOnCompletion })), ...[0, -1, NaN, Infinity].map(timeoutSeconds => ({ timeoutSeconds }))]) {
    await assert.rejects(() => run("echo forbidden", forbidden));
    const r = await request("run", { name: "Forbidden request", command: "echo forbidden", isAgent: false, notifyOnCompletion: true, triggerOnCompletion: false, ...forbidden });
    assert.equal(r.ok, false);
  }
  const caps = await request("capabilities", {});
  assert.equal((await call("bg_status", {})).details.tasks.length, taskCount);
  assert.equal(caps.ok, true); assert.match(JSON.stringify(caps), /"run_is_agent":false/); assert.match(JSON.stringify(caps), /"run_completion_trigger":true/);
  nextWake();
  const eventJob = await request("run", { name: "Event wake", command: "printf event-wake", isAgent: false, notifyOnCompletion: true, triggerOnCompletion: true });
  assert.equal(eventJob.ok, true); pids.add(eventJob.result.pid); assert.equal((await woke(eventJob.result)).status, "completed");
  const ok = await run("printf 'pilot-ok\\n'", { triggerOnCompletion: false });
  assert.equal(ok.triggerOnCompletion, false); assert.equal(ok.timeoutSeconds, 600);
  const done = await terminal(ok.id); assert.equal(done.status, "completed"); assert.equal(done.exitCode, 0);
  assert.match(JSON.stringify((await call("bg_logs", { taskId: ok.id, maxBytes: 256 })).content), /pilot-ok/);
  nextWake();
  await session.prompt('/bg --name "Command default" printf command-default');
  const commandJob = (await call("bg_status", {})).details.tasks.find(t => t.name === "Command default");
  assert.ok(commandJob); assert.equal(commandJob.triggerOnCompletion, true); await woke(commandJob);
  const failed = await run("printf 'pilot-fail\\n'; exit 7", { triggerOnCompletion: false }); assert.equal((await terminal(failed.id)).exitCode, 7);
  const muted = await run("printf muted", { notifyOnCompletion: false });
  assert.equal(muted.triggerOnCompletion, false); await terminal(muted.id);
  nextWake();
  const timed = await run("sleep 30", { timeoutSeconds: 1 }); assert.equal((await woke(timed)).status, "failed"); await until(() => !alive(timed.pid));
  nextWake();
  const tree = await run(node("const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log('CHILD='+c.pid);setInterval(()=>{},1000)"));
  const child = await until(async () => { const m = JSON.stringify((await call("bg_logs", { taskId: tree.id })).content).match(/CHILD=(\d+)/); return m && Number(m[1]); }); pids.add(child);
  await call("bg_kill", { taskId: tree.id }); assert.equal((await woke(tree)).status, "killed"); await until(() => !alive(child) && !alive(tree.pid));
  for (const surviveReload of [false, true]) {
    const huge = await run(node("process.stdout.write('x'.repeat(2*1024*1024));setInterval(()=>{},1000)"), { surviveReload, triggerOnCompletion: false });
    const capped = await terminal(huge.id); assert.equal(capped.status, "failed"); assert.match(capped.error, /cap/);
    const full = join(cwd, huge.outputPath); assert.ok(statSync(full).size <= 1024 * 1024);
    const window = await call("bg_logs", { taskId: huge.id, maxBytes: 256 }); assert.ok(window.details.bytesRead <= 256);
    await until(() => !alive(huge.pid));
  }
  const keep = await run("sleep 30", { surviveReload: true, triggerOnCompletion: false });
  const stop = await run("sleep 30", { triggerOnCompletion: false });
  assert.equal(keep.status, "running"); assert.equal(stop.status, "running");
  await session.reload();
  const rebound = await status(keep.id); assert.equal(rebound.pid, keep.pid); assert.equal(rebound.status, "running"); assert.ok(alive(keep.pid)); await until(() => !alive(stop.pid));
  await call("bg_kill", { taskId: keep.id }); assert.equal((await terminal(keep.id)).status, "killed"); await until(() => !alive(keep.pid));
  const restart = await run("sleep 30", { surviveReload: true });
  // Same native shutdown dispatcher as CLI; dispose alone does not emit session_shutdown.
  await emitSessionShutdownEvent(session._extensionRunner, { type: "session_shutdown", reason: "quit" });
  session.dispose(); session = undefined; await until(() => !alive(restart.pid));
  await create(); assert.ok(!alive(restart.pid)); assert.ok((await call("bg_status", {})).details.tasks.every(t => t.status !== "running"));
  assert.equal(modelTurns, expectedRuns); assert.equal(provider.state.callCount, expectedTurns);
  provider.appendResponses([async () => { await new Promise(resolve => { releaseBusy = resolve; }); return fauxAssistantMessage("Busy turn finished"); }]);
  expectedTurns++; expectedRuns++;
  const busy = session.prompt("Offline busy turn");
  await until(() => releaseBusy);
  nextWake(false);
  const queued = await run("printf busy-wake");
  await terminal(queued.id); await until(() => session.agent.peekQueuedMessages().some(m => m.role === "custom" && m.details?.id === queued.id));
  assert.equal(provider.state.callCount, expectedTurns - 1, "Busy completion must queue, not overlap provider calls");
  releaseBusy(); releaseBusy = undefined; await busy; await woke(queued);
  nextWake();
  const cancelled = await run("sleep 30", { triggerOnCompletion: true });
  await call("bg_kill", { taskId: cancelled.id }); assert.equal((await woke(cancelled)).status, "killed"); await until(() => !alive(cancelled.pid));
  const gate = join(root, "finish-after-reload");
  nextWake();
  const survivor = await run(node(`const fs=require('node:fs');const t=setInterval(()=>{if(fs.existsSync(${JSON.stringify(gate)})){clearInterval(t);console.log('reload-wake')}},20)`), { surviveReload: true });
  await session.reload();
  const adopted = await status(survivor.id); assert.equal(adopted.pid, survivor.pid); assert.equal(adopted.triggerOnCompletion, true); assert.ok(alive(survivor.pid));
  writeFileSync(gate, "finish"); assert.equal((await woke(survivor)).status, "completed");
  const shutdownJob = await run("sleep 30", { surviveReload: true, triggerOnCompletion: true });
  await emitSessionShutdownEvent(session._extensionRunner, { type: "session_shutdown", reason: "quit" });
  session.dispose(); session = undefined; await until(() => !alive(shutdownJob.pid));
  await create(); await session.waitForIdle();
  assert.ok((await call("bg_status", {})).details.tasks.every(t => t.status !== "running"));
  await emitSessionShutdownEvent(session._extensionRunner, { type: "session_shutdown", reason: "quit" });
  assert.deepEqual(errors, []); assert.equal(modelTurns, expectedRuns); assert.equal(provider.state.callCount, expectedTurns); assert.equal(network, 0);
  console.log(`PASS real SDK: process-only surface; tool/EventBus guards; default tool/command wake and explicit opt-outs; ${expectedTurns} actual faux requests/${expectedRuns} agent runs for default/explicit success/failure/timeout/EventBus/command/busy/cancel/reload; no duplicate wake or shutdown/history replay; timeout/tree kill/1MiB cap retained; 0 network attempts`);
} finally {
  releaseBusy?.();
  if (session) { try { await session._extensionRunner.emit({ type: "session_shutdown", reason: "quit" }); } catch {} session.dispose(); }
  for (const pid of pids) if (alive(pid)) { try { process.kill(-pid, "SIGKILL"); } catch {} try { process.kill(pid, "SIGKILL"); } catch {} }
  globalThis.fetch = oldFetch;
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
  // Flush referenced durable I/O before deleting the workspace, including terminal callbacks.
  process.once("beforeExit", () => rmSync(root, { recursive: true, force: true }));
}
