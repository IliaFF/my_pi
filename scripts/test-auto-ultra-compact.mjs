#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(process.argv[2] ?? new URL("..", import.meta.url).pathname);
const source = resolve(root, "local-extensions/auto-ultra-compact/index.ts");
const autoModule = await import(pathToFileURL(source).href);
const { default: autoUltraCompact, analyzeCompactability, estimateCompactionTokens } = autoModule;
const text = (length) => [{ type: "text", text: "x".repeat(length) }];
const analyze = (messages) => analyzeCompactability(messages, 12_000);

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

async function createContinuationHarness(home) {
  const handlers = new Map();
  const sent = [];
  const commands = new Map();
  const notices = [];
  let compactOptions;
  let compactionLocked = false;
  let contextTokens = 500_000;
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
    model: { contextWindow: 1_000_000, provider: "test", id: "model" },
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
let nativeRestoreMessage;
const testHome = mkdtempSync(join(tmpdir(), "pi-compaction-followup-"));
process.env.HOME = testHome;
process.env.PI_CODING_AGENT_DIR = testHome;
try {
  const blockedHome = join(testHome, "not-a-directory");
  writeFileSync(blockedHome, "fixture blocks former recovery directory");
  process.env.HOME = blockedHome;
  const withoutRecovery = await createContinuationHarness(testHome);
  try {
    await withoutRecovery.emit("turn_end");
  } finally {
    process.env.HOME = testHome;
  }
  assert.equal(withoutRecovery.compactCalls(), 1,
    "autocompaction must not depend on a writable emergency recovery location");

  const automatic = await createContinuationHarness(testHome);
  const preparation = { tokensBefore: 500_000, firstKeptEntryId: "kept", messagesToSummarize: [] };
  automatic.setContextTokens(170_000);
  await automatic.emit("turn_end");
  assert.equal(automatic.compactCalls(), 0, "old 170k cap must be inactive for large-window models");
  automatic.setContextTokens(499_999);
  await automatic.emit("turn_end");
  assert.equal(automatic.compactCalls(), 0, "must not compact below 500k");
  automatic.setContextTokens(500_000);
  await automatic.emit("turn_end");
  assert.equal(automatic.compactCalls(), 1, "must compact at 500k");
  assert.equal(existsSync(join(testHome, ".pi/agent/recovery")), false, "must not create recovery directory");
  assert.equal(existsSync(join(testHome, ".pi-stack/recovery")), false, "must not create project recovery mirror");
  assert.match(automatic.callbacks().customInstructions, /current TODO\.md/);
  await automatic.emit("session_before_compact", { reason: "manual", preparation, branchEntries: [] });
  await automatic.emit("session_compact", { reason: "manual", compactionEntry: {} });
  assert.equal(automatic.sent.length, 0, "extension continuation must wait until Pi unlocks manual compaction");
  automatic.completeCompaction();
  assert.equal(automatic.sent.length, 1, "extension auto-compaction must enqueue exactly one continuation after onComplete");
  assert.deepEqual(automatic.sent[0].options, { deliverAs: "followUp" });
  assert.match(automatic.sent[0].message, /^После автосжатия сначала прочитай текущий TODO\.md/);
  assert.ok(automatic.sent[0].message.includes("не требуют отдельной записи"));
  assert.doesNotMatch(automatic.sent[0].message, /recovery|packet/i);
  nativeRestoreMessage = automatic.sent[0].message;
  assert.doesNotMatch(await automatic.status(), /lastRecovery|lastProjectRecovery|summaryContract/);
  automatic.setContextTokens(505_000);
  await automatic.emit("turn_end");
  assert.equal(automatic.compactCalls(), 2, "ineffective compaction must bypass cooldown and compact again after first real post-compaction usage");

  const reduced = await createContinuationHarness(testHome);
  await reduced.emit("turn_end");
  await reduced.emit("session_before_compact", { reason: "manual", preparation, branchEntries: [] });
  await reduced.emit("session_compact", { reason: "manual", compactionEntry: {} });
  reduced.completeCompaction();
  reduced.setContextTokens(60_000);
  await reduced.emit("turn_end");
  assert.equal(reduced.compactCalls(), 1, "effective compaction must consume post-check without another compaction");

  const managedSettings = JSON.parse(readFileSync(resolve(root, "configs/settings.json"), "utf8"));
  assert.equal(managedSettings.compaction.keepRecentTokens, 12_000, "managed Pi compaction must retain only 12k estimated tokens");

  const builtin = await createContinuationHarness(testHome);
  await builtin.emit("session_before_compact", { reason: "threshold", preparation, branchEntries: [] });
  await builtin.emit("session_compact", { reason: "threshold", compactionEntry: {} });
  assert.equal(builtin.sent.length, 1, "built-in threshold compaction must still enqueue continuation during its lifecycle");

  const manual = await createContinuationHarness(testHome);
  await manual.emit("session_before_compact", { reason: "manual", preparation, branchEntries: [] });
  await manual.emit("session_compact", { reason: "manual", compactionEntry: {} });
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

  const legacyPackets = [join(testHome, ".pi/agent/recovery/legacy.md"),
    join(testHome, ".pi-stack/recovery/legacy.md")];
  for (const packet of legacyPackets) {
    mkdirSync(resolve(packet, ".."), { recursive: true });
    writeFileSync(packet, "existing private packet must remain unchanged\n");
  }
  const withLegacy = await createContinuationHarness(testHome);
  await withLegacy.emit("turn_end");
  assert.equal(withLegacy.compactCalls(), 1);

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
    manager.appendMessage({ role: "user", content: nativeRestoreMessage, timestamp: -2 });
    manager.appendMessage({ role: "user", content: "[TODO QUEUE sdk-fixture]\nЭто кандидат из Pending, ещё не взятый в работу.\n\nValidate archived SDK fixture.\nDo not publish yet.\n\nПосле claim используй настоящий id из результата инструмента, не placeholder кандидата.", timestamp: -1 });
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
      if (process.env.PI_TEST_EXPECT_INDEX_PATCH === "1") {
        const intents = result.summary.split("## User intents")[1].split("\n## ")[0];
        assert.match(intents, /Validate archived SDK fixture\./);
        assert.doesNotMatch(intents, /После автосжатия|\[TODO QUEUE/);
      }
      assert.equal(manager.getEntries().filter((entry) => entry.type === "compaction").length, 1);
      assert.equal(session.isCompacting, false);
      assert.equal(modelCalls, 0, "deterministic compaction must not authenticate or call a provider");
      assert.deepEqual(errors, []);
      console.log(`PASS SDK deterministic /compact (${paths[0] === source ? "auto first" : "fold first"}): ${(performance.now() - started).toFixed(0)}ms, 0 model/auth calls`);
    } finally { session.dispose(); }
  }
  assert.ok(existsSync(join(testHome, "context-fold")), "compaction ledger must be inside fixture agent");
  for (const packet of legacyPackets) {
    assert.equal(readFileSync(packet, "utf8"), "existing private packet must remain unchanged\n");
  }

} finally {
  if (oldAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
  else process.env.PI_CODING_AGENT_DIR = oldAgentDir;
  if (oldHome === undefined) delete process.env.HOME;
  else process.env.HOME = oldHome;
  rmSync(testHome, { recursive: true, force: true });
}

console.log("PASS auto-ultra-compact 12k retention, post-compaction verification, compactability, no recovery filesystem dependency, continuation lifecycle and single deterministic owner");
