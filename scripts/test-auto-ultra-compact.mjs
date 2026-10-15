#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(process.argv[2] ?? new URL("..", import.meta.url).pathname);
const source = resolve(root, "local-extensions/auto-ultra-compact/index.ts");
const autoModule = await import(pathToFileURL(source).href);
const { default: autoUltraCompact, SUMMARY_CONTRACT_ID, analyzeCompactability, authoritativeRecoveryEntries, estimateCompactionTokens, projectAuthoritativeState, validateProjectedAuthoritativeState } = autoModule;
const text = (length) => [{ type: "text", text: "x".repeat(length) }];
const analyze = (messages) => analyzeCompactability(messages, 12_000);

assert.match(autoModule.ULTRA_INSTRUCTIONS, /Before resuming multi-step project work/);
assert.match(autoModule.ULTRA_INSTRUCTIONS, /small single-step edits need no separate task entry/);
for (const details of [undefined, { contract: SUMMARY_CONTRACT_ID, validator: "passed" }]) {
  const reminder = autoModule.recoveryFollowupMessage({ compactionEntry: { details } });
  assert.ok(reminder.includes("если продолжаешь многошаговую проектную работу"));
  assert.ok(reminder.includes("не требуют отдельной записи"));
}
const taskPolicy = readFileSync(resolve(root, "configs/APPEND_SYSTEM.md"), "utf8");
assert.ok(taskPolicy.includes("Discussions, answers and small single-step edits need no separate entry."));
assert.ok(taskPolicy.includes("report starts, blockers and outcomes, not bookkeeping"));

assert.equal(estimateCompactionTokens({ role: "user", content: text(4001) }), 1001);
assert.equal(analyze([
  { role: "user", content: text(1000) },
  { role: "assistant", content: text(1000) },
]).compactable, false, "small session must not call ctx.compact");
assert.equal(analyze([
  { role: "user", content: text(100_000) },
  { role: "assistant", content: text(1000) },
]).compactable, false, "single indivisible old message has no discardable prefix");
assert.equal(analyze([
  { role: "user", content: text(4000) },
  { role: "assistant", content: text(4000) },
  { role: "user", content: text(100_000) },
]).compactable, true, "older complete turn must be compactable");
assert.equal(analyze([
  { role: "user", content: text(4000) },
  { role: "assistant", content: text(100_000) },
]).compactable, true, "large turn prefix must be compactable");
assert.equal(analyze([
  { role: "compactionSummary", summary: "old summary" },
  { role: "user", content: text(1000) },
]).compactable, false, "previous summary is boundary, not discardable history");

const markerText = [
  "[GOAL] Old goal",
  "[GOAL] Current goal",
  "[CONSTRAINT] Keep selected model",
  "[CONSTRAINT] Reopened constraint",
  "[REVOKED] Reopened constraint",
  "[CONSTRAINT] Reopened constraint",
  "[DECISION] Retired decision",
  "[SUPERSEDED] Retired decision",
  "[DECISION] Active decision",
  "[DECISION] Reopened decision",
  "[SUPERSEDED] Reopened decision",
  "[DECISION] Reopened decision",
  "[BLOCKER] Resolved blocker",
  "[RESOLVED] Resolved blocker",
  "[BLOCKER] Reopened blocker",
  "[RESOLVED] Reopened blocker",
  "[BLOCKER] Reopened blocker",
  "[NEXT] Finished step",
  "[COMPLETED] Finished step",
  "[NEXT] Immediate step",
  "[NEXT] Reopened step",
  "[COMPLETED] Reopened step",
  "[NEXT] Reopened step",
  "[VALIDATION] focused test PASS",
].join("\n");
const preparation = { messagesToSummarize: [{ role: "assistant", content: [{ type: "text", text: markerText }] }] };
const event = { preparation, branchEntries: [{ type: "message", message: { role: "assistant", content: [{ type: "text", text: "[SUPERSEDED] Reopened decision\n[COMPLETED] Reopened step" }] } }] };
const summary = `## Goal
Generated goal

## Constraints & Preferences
- Generated

## Progress
### Done
- [x] Finished step

### In Progress
- [ ] Generated

### Blocked
- None

## Key Decisions
- [DECISION] Model invented state

## Next Steps
1. Generated

## Critical Context
[COMPLETED] Finished step`;
const entries = authoritativeRecoveryEntries(event);
assert.deepEqual(entries.map(({ marker, value }) => `${marker}:${value}`), [
  "CONSTRAINT:Reopened constraint",
  "CONSTRAINT:Keep selected model",
  "DECISION:Reopened decision",
  "DECISION:Active decision",
  "BLOCKER:Reopened blocker",
  "VALIDATION:focused test PASS",
]);
const projected = projectAuthoritativeState(summary, event);
for (const value of ["[CONSTRAINT] Reopened constraint", "[CONSTRAINT] Keep selected model", "[DECISION] Reopened decision", "[DECISION] Active decision", "[BLOCKER] Reopened blocker", "[VALIDATION] focused test PASS"]) assert.ok(projected.includes(value));
for (const closedMarker of ["[DECISION] Retired decision", "[BLOCKER] Resolved blocker", "[GOAL]", "[NEXT]", "[COMPLETED]"]) assert.ok(!projected.includes(closedMarker));
assert.ok(projected.includes("- [x] Finished step"), "closed work must remain valid Done prose");
assert.ok(!projected.includes("Model invented state"), "model-generated marker lines must be removed");
assert.deepEqual(validateProjectedAuthoritativeState(projected, event), []);
assert.ok(validateProjectedAuthoritativeState(projected.replace("<!-- authoritative-state:end -->", "[DECISION] Injected state\n<!-- authoritative-state:end -->"), event).length > 0);
assert.ok(validateProjectedAuthoritativeState(`${projected}\n[NEXT] Outside marker`, event).length > 0);
assert.equal(projectAuthoritativeState(projected, event), projected, "projection must be idempotent");
assert.equal((projected.match(/<!-- authoritative-state:start -->/g) ?? []).length, 1);

async function createContinuationHarness(home) {
  const handlers = new Map();
  const sent = [];
  const commands = new Map();
  const notices = [];
  let compactOptions;
  let compactionLocked = false;
  let contextTokens = 170_000;
  let compactCalls = 0;
  const api = {
    on(name, handler) {
      const list = handlers.get(name) ?? [];
      list.push(handler);
      handlers.set(name, list);
    },
    registerCommand(name, command) { commands.set(name, command); },
    registerTool() {},
    sendUserMessage(message, options) {
      if (compactionLocked) throw new Error("Cannot submit a prompt while compaction is in progress. Wait for compaction to finish and retry.");
      sent.push({ message, options });
    },
  };
  autoUltraCompact(api);
  const compactableMessages = [
    { role: "user", content: text(4000) },
    { role: "assistant", content: text(4000) },
    { role: "user", content: text(100_000) },
  ];
  const ctx = {
    cwd: home,
    hasUI: true,
    model: { contextWindow: 200_000, provider: "test", id: "model" },
    getContextUsage: () => ({ tokens: contextTokens }),
    compact(options) { compactOptions = options; compactCalls++; compactionLocked = true; },
    sessionManager: {
      getBranch: () => [],
      buildSessionContext: () => ({ messages: compactableMessages }),
    },
    ui: { notify(message) { notices.push(message); } },
  };
  const emit = async (name, event = {}) => {
    for (const handler of handlers.get(name) ?? []) await handler(event, ctx);
  };
  const completeCompaction = () => {
    assert.ok(compactOptions, "extension threshold must call ctx.compact");
    compactionLocked = false;
    compactOptions.onComplete?.({});
  };
  return { emit, sent, completeCompaction, callbacks: () => compactOptions,
    status: async () => { await commands.get("auto-ultra-compact-status").handler("", ctx); return notices.at(-1); },
    compactCalls: () => compactCalls, setContextTokens: (tokens) => { contextTokens = tokens; } };
}

const foldSource = resolve(process.env.PI_CODING_AGENT_DIR ?? join(process.env.HOME, ".pi/agent"), "npm/node_modules/context-fold/index.ts");
const oldHome = process.env.HOME;
const oldAgentDir = process.env.PI_CODING_AGENT_DIR;
const testHome = mkdtempSync(join(tmpdir(), "pi-compaction-followup-"));
process.env.HOME = testHome;
process.env.PI_CODING_AGENT_DIR = testHome;
try {
  const automatic = await createContinuationHarness(testHome);
  const preparation = { tokensBefore: 170_000, firstKeptEntryId: "kept", messagesToSummarize: [] };
  automatic.setContextTokens(169_999);
  await automatic.emit("turn_end");
  assert.equal(automatic.compactCalls(), 0, "must not compact below 170k");
  automatic.setContextTokens(170_000);
  await automatic.emit("turn_end");
  assert.equal(automatic.compactCalls(), 1, "must compact at 170k");
  await automatic.emit("session_before_compact", { reason: "manual", preparation, branchEntries: [] });
  await automatic.emit("session_compact", { reason: "manual", compactionEntry: { details: { contract: SUMMARY_CONTRACT_ID, validator: "passed" } } });
  assert.equal(automatic.sent.length, 0, "extension continuation must wait until Pi unlocks manual compaction");
  automatic.completeCompaction();
  assert.equal(automatic.sent.length, 1, "extension auto-compaction must enqueue exactly one continuation after onComplete");
  assert.deepEqual(automatic.sent[0].options, { deliverAs: "followUp" });
  assert.match(automatic.sent[0].message, /^После автосжатия сначала прочитай текущий TODO\.md/);
  automatic.setContextTokens(175_000);
  await automatic.emit("turn_end");
  assert.equal(automatic.compactCalls(), 2, "ineffective compaction must bypass cooldown and compact again after first real post-compaction usage");

  const reduced = await createContinuationHarness(testHome);
  await reduced.emit("turn_end");
  await reduced.emit("session_before_compact", { reason: "manual", preparation, branchEntries: [] });
  await reduced.emit("session_compact", { reason: "manual", compactionEntry: { details: { contract: SUMMARY_CONTRACT_ID, validator: "passed" } } });
  reduced.completeCompaction();
  reduced.setContextTokens(60_000);
  await reduced.emit("turn_end");
  assert.equal(reduced.compactCalls(), 1, "effective compaction must consume post-check without another compaction");

  const managedSettings = JSON.parse(readFileSync(resolve(root, "configs/settings.json"), "utf8"));
  assert.equal(managedSettings.compaction.keepRecentTokens, 12_000, "managed Pi compaction must retain only 12k estimated tokens");

  const builtin = await createContinuationHarness(testHome);
  await builtin.emit("session_before_compact", { reason: "threshold", preparation, branchEntries: [] });
  await builtin.emit("session_compact", { reason: "threshold", compactionEntry: { details: { contract: SUMMARY_CONTRACT_ID, validator: "passed" } } });
  assert.equal(builtin.sent.length, 1, "built-in threshold compaction must still enqueue continuation during its lifecycle");

  const manual = await createContinuationHarness(testHome);
  await manual.emit("session_before_compact", { reason: "manual", preparation, branchEntries: [] });
  await manual.emit("session_compact", { reason: "manual", compactionEntry: { details: { contract: SUMMARY_CONTRACT_ID, validator: "passed" } } });
  assert.equal(manual.sent.length, 0, "manual /compact must remain idle");

  for (const reason of ["new", "resume", "fork", "reload", "quit"]) {
    const replaced = await createContinuationHarness(testHome);
    await replaced.emit("turn_end");
    await replaced.emit("session_before_compact", { reason: "manual", preparation, branchEntries: [] });
    await replaced.emit("session_compact", { reason: "manual", compactionEntry: {} });
    const oldCallbacks = replaced.callbacks();
    await replaced.emit("session_shutdown", { reason });
    if (reason !== "quit") {
      await replaced.emit("session_start", { reason });
      await replaced.emit("turn_end");
      assert.equal(replaced.compactCalls(), 2, "new session must not inherit cooldown or in-flight state");
    }
    const statusBefore = await replaced.status();
    oldCallbacks.onComplete();
    oldCallbacks.onError(new Error("late old-session error"));
    assert.equal(replaced.sent.length, 0, "old callback must never continue in replacement session");
    assert.equal(await replaced.status(), statusBefore, "old callbacks must not mutate replacement state");
  }
  const failed = await createContinuationHarness(testHome);
  await failed.emit("turn_end");
  await failed.emit("session_before_compact", { reason: "manual", preparation, branchEntries: [] });
  await failed.emit("session_compact_failed", { reason: "manual", aborted: false, errorMessage: "builtin provider failed" });
  assert.match(await failed.status(), /compactInFlight: false/);
  assert.match(await failed.status(), /followupPending: false/);
  assert.match(await failed.status(), /lastError: builtin provider failed/);
  for (let i = 0; i < 3; i++) await failed.emit("turn_end");
  assert.equal(failed.compactCalls(), 2, "failed compaction must not permanently block future attempts");
  await failed.emit("session_compact_failed", { reason: "manual", aborted: true });
  assert.match(await failed.status(), /lastError: Compaction cancelled/);

  // Run real Pi compaction with both extensions, never with a model provider.
  const coreRoot = resolve(realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim()), "../../..");
  const core = await import(pathToFileURL(join(coreRoot, "dist/index.js")).href);
  const { loadExtensions } = await import(pathToFileURL(join(coreRoot, "dist/core/extensions/loader.js")).href);
  const { createAgentSession, ModelRuntime, SessionManager, SettingsManager } = core;
  const own = await loadExtensions([source], testHome);
  assert.deepEqual(own.errors, []);
  assert.equal(own.extensions[0].handlers.has("session_before_compact"), false,
    "auto-ultra-compact must not register a competing summary owner");
  let modelCalls = 0;
  const runtime = await ModelRuntime.create({ authPath: join(testHome, "auth.json"), modelsPath: null,
    modelsStorePath: join(testHome, "models-store.json"), allowModelNetwork: false, refreshOnCreate: false });
  for (const name of ["stream", "streamSimple", "complete", "completeSimple", "getAuth"]) {
    runtime[name] = () => { modelCalls++; throw new Error(`Unexpected model operation: ${name}`); };
  }
  const model = { id: "offline", provider: "offline", api: "openai-completions", reasoning: false,
    maxTokens: 10000, contextWindow: 200000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } };
  for (const paths of [[foldSource, source], [source, foldSource]]) {
    const loaded = await loadExtensions(paths, testHome);
    assert.deepEqual(loaded.errors, []);
    assert.equal(loaded.extensions.filter((ext) => ext.handlers.has("session_before_compact")).length, 1,
      "context-fold must be the sole compaction owner in either load order");
    const resourceLoader = {
      getExtensions: () => loaded, getSkills: () => ({ skills: [], diagnostics: [] }),
      getPrompts: () => ({ prompts: [], diagnostics: [] }), getThemes: () => ({ themes: [], diagnostics: [] }),
      getAgentsFiles: () => ({ agentsFiles: [] }), getSystemPrompt: () => "Offline compaction test",
      getSystemPromptSource: () => undefined, getAppendSystemPrompt: () => [], getAppendSystemPromptSources: () => [],
      extendResources() {}, async reload() {},
    };
    const manager = SessionManager.create(testHome, testHome);
    const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };
    for (let i = 0; i < 4; i++) {
      manager.appendMessage({ role: "user", content: `Keep exact intent ${i}`, timestamp: i * 2 });
      manager.appendMessage({ role: "assistant", content: text(20000), api: model.api, provider: model.provider,
        model: model.id, stopReason: "stop", usage, timestamp: i * 2 + 1 });
    }
    const { session } = await createAgentSession({ cwd: testHome, agentDir: testHome, model,
      modelRuntime: runtime, resourceLoader, tools: [], sessionManager: manager,
      settingsManager: SettingsManager.inMemory({ compaction: { enabled: true, reserveTokens: 12500, keepRecentTokens: 12000 } }) });
    const errors = [];
    try {
      await session.bindExtensions({ onError: (error) => errors.push(error) });
      const started = performance.now();
      const result = await session.compact();
      assert.match(result.summary, /deterministic seed index — no model involved/);
      assert.match(result.summary, /Keep exact intent/);
      assert.equal(manager.getEntries().filter((entry) => entry.type === "compaction").length, 1);
      assert.equal(session.isCompacting, false);
      assert.equal(modelCalls, 0, "deterministic compaction must not authenticate or call a provider");
      assert.deepEqual(errors, []);
      console.log(`PASS SDK deterministic /compact (${paths[0] === source ? "auto first" : "fold first"}): ${(performance.now() - started).toFixed(0)}ms, 0 model/auth calls`);
    } finally { session.dispose(); }
  }
  assert.ok(existsSync(join(testHome, "context-fold")), "compaction ledger must be inside fixture agent");

} finally {
  if (oldAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
  else process.env.PI_CODING_AGENT_DIR = oldAgentDir;
  if (oldHome === undefined) delete process.env.HOME;
  else process.env.HOME = oldHome;
  rmSync(testHome, { recursive: true, force: true });
}

console.log("PASS auto-ultra-compact 12k retention, post-compaction verification, compactability, recovery projector, continuation lifecycle and single deterministic owner");
