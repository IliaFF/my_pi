#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = mkdtempSync(join(tmpdir(), "pi-loop-profiler-test-"));
process.env.PI_CODING_AGENT_DIR = root;
process.env.PI_PROFILE = "0";
const runsPath = join(root, "observability", "loop-runs.jsonl");
mkdirSync(join(root, "observability"), { recursive: true });
writeFileSync(runsPath, `${Array.from({ length: 500 }, (_, i) => JSON.stringify({ version: 1, projectHash: "old", runId: `old-${i}` })).join("\n")}\n`);

try {
  const moduleUrl = pathToFileURL(process.argv[2] || join(process.cwd(), "local-extensions", "loop-profiler.ts")).href;
  const { default: loopProfiler, formatLoopReport } = await import(`${moduleUrl}?test=${Date.now()}`);
  const handlers = new Map(), commands = new Map(), notifications = [];
  const pi = {
    on(name, handler) { const list = handlers.get(name) ?? []; list.push(handler); handlers.set(name, list); },
    registerCommand(name, options) { commands.set(name, options); },
  };
  loopProfiler(pi);
  const ctx = {
    cwd: "/workspace/private-project", mode: "rpc", model: { provider: "test-provider", id: "test-model" }, thinkingLevel: "medium",
    sessionManager: { getSessionId: () => "private-session-id" },
    ui: { notify(message, type) { notifications.push({ message, type }); } },
  };
  const emit = async (name, event) => { for (const handler of handlers.get(name) ?? []) await handler(event, ctx); };
  const secret = "SECRET_PROMPT_ARGUMENT_AND_OUTPUT";
  const preview = `[context-sidecar] Large bash output indexed locally\n\nSource: src-test\nSize: 48.8 KiB, 400 lines, 13 chunks\n\nNext actions:\n- Search concise snippets first: context_search\n\nPreview:\nHEAD\nTAIL`;

  await emit("before_agent_start", {
    type: "before_agent_start", messageType: "user", prompt: secret, systemPrompt: `system-${secret}`,
    systemPromptOptions: { selectedTools: ["read", "grep", "find", "edit", "write", "bash"], contextFiles: [], skills: [] },
  });
  await emit("turn_start", { type: "turn_start", turnIndex: 0, timestamp: Date.now() });
  await emit("context", { type: "context", messages: [{ role: "user", content: `${secret}${"x".repeat(1_000)}` }] });
  await emit("before_provider_request", { type: "before_provider_request", payload: { input: secret } });
  await emit("after_provider_response", { type: "after_provider_response", status: 200, headers: {} });
  await emit("message_update", { type: "message_update", message: { role: "assistant" }, assistantMessageEvent: { type: "text_delta", delta: "x" } });

  await emit("tool_execution_start", { type: "tool_execution_start", toolCallId: "grep-1", toolName: "grep", args: { pattern: secret } });
  await emit("tool_execution_end", { type: "tool_execution_end", toolCallId: "grep-1", toolName: "grep", result: { content: [{ type: "text", text: "10 matches" }] }, isError: false });
  await emit("tool_execution_start", { type: "tool_execution_start", toolCallId: "bash-1", toolName: "bash", args: { command: `npm test # ${secret}` } });
  await emit("tool_execution_end", {
    type: "tool_execution_end", toolCallId: "bash-1", toolName: "bash", isError: false,
    result: { content: [{ type: "text", text: preview }], details: {} },
  });
  await emit("turn_end", { type: "turn_end", turnIndex: 0, message: {}, toolResults: [{}, {}] });

  await emit("turn_start", { type: "turn_start", turnIndex: 1, timestamp: Date.now() });
  await emit("tool_execution_start", { type: "tool_execution_start", toolCallId: "edit-1", toolName: "edit", args: { path: secret } });
  await emit("tool_execution_end", { type: "tool_execution_end", toolCallId: "edit-1", toolName: "edit", result: { content: [{ type: "text", text: "permission denied" }, { type: "image", data: secret }] }, isError: true });
  await emit("message_end", { type: "message_end", message: { role: "assistant", content: [], usage: { input: 10, output: 2, cacheRead: 90, cacheWrite: 0 } } });
  await emit("turn_end", { type: "turn_end", turnIndex: 1, message: {}, toolResults: [{}] });
  await emit("agent_settled", { type: "agent_settled" });

  const persisted = readFileSync(runsPath, "utf8");
  if (persisted.includes(secret)) throw new Error("sensitive prompt, arguments, details, path, or output persisted");
  const lines = persisted.trim().split("\n");
  if (lines.length !== 500) throw new Error(`retention mismatch: ${lines.length}`);
  const run = JSON.parse(lines.at(-1));
  if (run.version !== 4 || run.batchingPolicy !== "searchable-context-v4") throw new Error("v4 policy identity missing");
  if (run.modelCalls !== 1 || run.toolCalls !== 3 || run.directToolCalls !== 3) throw new Error("direct boundary counters mismatch");
  for (const key of ["fabricPrograms", "nestedOperations", "fabricContextOutputChars", "nestedToolOutputChars", "fabricProgramNestedHistogram"]) {
    if (key in run) throw new Error(`v4 record persists legacy field: ${key}`);
  }
  if (run.singleToolBatches !== 1 || run.parallelToolBatches !== 1 || run.outerParallelToolBatches !== 1) throw new Error("batch counters mismatch");
  const contextChars = "10 matches".length + preview.length + "permission denied".length;
  if (run.modelContextToolOutputChars !== contextChars || run.directContextOutputChars !== contextChars || run.modelContextToolOutputImages !== 1) throw new Error("direct context output counters mismatch");
  if (run.contextIndexedToolResults !== 1) throw new Error("indexed receipt counter mismatch");
  if (run.largeToolResults !== 0 || run.externalizedToolResults !== 0 || run.contextExternalizedToolResults !== 0) throw new Error("legacy externalization counters changed");
  if (run.toolErrors !== 1 || run.outerToolErrors !== 1 || run.rootToolErrors !== 1 || run.errorCategories.permission !== 1) throw new Error("direct error telemetry mismatch");
  if (!run.runId || !run.projectHash || !run.sessionHash || run.providerStatuses["200"] !== 1) throw new Error("privacy-safe correlation fields missing");

  const report = formatLoopReport([run], "last");
  if (!report.includes("searchable-context-v4") || !report.includes("indexed receipts 1") || !report.includes("Searchable context policy")) throw new Error("v4 report missing");
  const pilot = formatLoopReport([run], "batching");
  if (!pilot.includes("Searchable context pilot") || !pilot.includes("post-policy 1/10") || !pilot.includes("indexed receipts 1")) throw new Error("v4 pilot report missing");
  await commands.get("loop-report").handler("last", ctx);
  if (!notifications.at(-1)?.message.includes("Loop last")) throw new Error("loop-report command missing");

  const v2 = { ...run, version: 2, batchingPolicy: "direct-default-fabric-selective-v2", fabricPrograms: 1, nestedOperations: 2, fabricContextOutputChars: 20, nestedToolOutputChars: 100, fabricProgramNestedHistogram: { "2-4": 1 }, fabricProgramsZeroNested: 0, fabricProgramsSingleNested: 0, fabricProgramsMultiNested: 1, fabricProgramsFivePlusNested: 0, fabricProgramMaxNested: 2 };
  const v2Report = formatLoopReport([v2], "last");
  if (!v2Report.includes("legacy batching") || !v2Report.includes("Fabric projection") || !v2Report.includes("Fabric program sizes")) throw new Error("v2 Fabric record compatibility missing");
  const v1 = { ...v2, version: 1, batchingPolicy: undefined };
  for (const key of ["modelContextToolOutputChars", "fabricContextOutputChars", "directContextOutputChars", "nestedToolOutputChars", "modelContextToolOutputImages", "nestedToolOutputImages", "contextOutputByTool", "nestedOutputByTool", "fabricProgramNestedHistogram"]) delete v1[key];
  const v1Report = formatLoopReport([v1], "last");
  if (!v1Report.includes("legacy record") || !v1Report.includes("legacy mixed") || !v1Report.includes("program sizes unavailable")) throw new Error("v1 record compatibility missing");

  // Pi 1.2 custom-message starts have no prompt field.
  await emit("before_agent_start", {
    type: "before_agent_start", messageType: "custom",
    message: { customType: "test", content: secret, display: false },
    systemPrompt: "system", systemPromptOptions: {},
  });
  await emit("agent_settled", { type: "agent_settled" });
  const latest = () => JSON.parse(readFileSync(runsPath, "utf8").trim().split("\n").at(-1));
  assert.equal(latest().promptChars, 0);
  assert.equal(latest().trigger, "custom");

  const originalClock = process.hrtime.bigint;
  let now = 1_000_000_000n;
  process.hrtime.bigint = () => now;
  const at = async (ms, name, event = {}) => {
    now = 1_000_000_000n + BigInt(ms) * 1_000_000n;
    await emit(name, { type: name, ...event });
  };
  const begin = { messageType: "user", prompt: secret, systemPrompt: "system", systemPromptOptions: {} };
  const start = (id, name, parent) => ({ toolCallId: id, toolName: name, parentToolCallId: parent, args: {} });
  const end = (id, name, text = "ok", parent, isError = false) => ({
    toolCallId: id, toolName: name, parentToolCallId: parent, isError,
    result: { content: [{ type: "text", text }] },
  });
  const assistant = (stopReason, cost = 0) => ({
    message: { role: "assistant", content: [], stopReason, usage: { input: 10, output: 2, cacheRead: 90, cacheWrite: 0, cost: { total: cost } } },
  });
  try {
    await at(0, "input", { source: "interactive", text: secret });
    await at(5, "before_agent_start", begin);
    await at(10, "turn_start", { turnIndex: 0 });
    await at(12, "before_provider_request", { payload: {} });
    await at(20, "after_provider_response", { status: 200 });
    await at(30, "message_update", { message: { role: "assistant" }, assistantMessageEvent: { type: "text_delta" } });
    await at(40, "message_end", assistant("toolUse", 0.2));
    await at(40, "tool_execution_start", start("outer", "codemode"));
    await at(50, "tool_execution_start", start("nested", "read", "outer"));
    await at(70, "tool_execution_end", end("nested", "read", secret.repeat(100), "outer"));
    await at(100, "tool_execution_end", end("outer", "codemode", "receipt"));
    await at(100, "tool_execution_start", start("failed", "bash"));
    await at(110, "tool_execution_end", end("failed", "bash", "permission denied", undefined, true));
    await at(110, "turn_end", { toolResults: [{}, {}] });
    await at(120, "turn_start", { turnIndex: 1 });
    await at(140, "message_end", assistant("stop", 0.3));
    await at(140, "turn_end", { toolResults: [] });
    await at(150, "agent_settled");
    const timed = latest();
    assert.equal(timed.durationMs, 145, "run duration keeps its historical before_agent_start origin");
    assert.equal(timed.ttftMs, 25);
    assert.equal(timed.inputToStartMs, 5);
    assert.equal(timed.modelPhaseMs, 50);
    assert.equal(timed.activeToolMs, 70, "nested intervals count only once");
    assert.equal(timed.otherMs, 25);
    assert.equal(timed.phaseOverlapMs, 0);
    assert.equal(timed.toolDurationMs, 90, "cumulative tool duration includes nested calls");
    assert.equal(timed.outerToolDurationMs, 70);
    assert.equal(timed.nestedToolCalls, 1);
    assert.equal(timed.directToolCalls, 2);
    assert.equal(timed.toolCalls, 3);
    assert.equal(timed.modelContextToolOutputChars, "receiptpermission denied".length, "nested output is not model context");
    assert.equal(timed.nestedToolOutputChars, secret.length * 100);
    assert.equal(timed.toolMsByName.codemode, 60);
    assert.equal(timed.toolMsByName.read, 20);
    assert.equal(timed.failedToolMsByName.bash, 10);
    assert.equal(timed.costUsd, 0.5);
    assert.equal(timed.stopReason, "stop");
    assert.equal(timed.timingIncomplete, false);
    assert.match(formatLoopReport([timed]), /active tools/);
    assert.match(formatLoopReport([timed]), /slow tools/);

    // Multiple before_agent_start events before settling are one operation, not truncated runs.
    const previousId = timed.runId;
    await at(200, "before_agent_start", begin);
    await at(210, "turn_start", { turnIndex: 0 });
    await at(220, "message_end", assistant("error"));
    await at(225, "before_agent_start", { ...begin, messageType: "custom", prompt: undefined });
    assert.equal(latest().runId, previousId, "continuation must not persist a partial operation");
    await at(230, "turn_start", { turnIndex: 1 });
    await at(250, "message_end", assistant("stop"));
    await at(260, "agent_settled");
    assert.equal(latest().durationMs, 60);
    assert.equal(latest().modelPhaseMs, 30);
    assert.equal(latest().stopReason, "stop", "successful retry replaces error status");

    // Overlapping root calls, LLM/tool overlap, missing ends and duplicate notifications.
    await at(300, "before_agent_start", begin);
    await at(300, "turn_start", { turnIndex: 0 });
    await at(310, "tool_execution_start", start("a", "read"));
    await at(320, "tool_execution_start", start("b", "read"));
    await at(330, "message_end", assistant("aborted"));
    await at(340, "tool_execution_end", end("a", "read"));
    await at(350, "tool_execution_end", end("b", "read"));
    await at(355, "tool_execution_end", end("b", "read"));
    await at(360, "tool_execution_start", start("unfinished", "bash"));
    await at(370, "agent_settled");
    const partial = latest();
    assert.equal(partial.modelPhaseMs, 30);
    assert.equal(partial.activeToolMs, 50);
    assert.equal(partial.phaseOverlapMs, 20);
    assert.equal(partial.otherMs, 10);
    assert.equal(partial.modelPhaseMs + partial.activeToolMs - partial.phaseOverlapMs + partial.otherMs, partial.durationMs);
    assert.equal(partial.toolMsByName.read, 60);
    assert.equal(partial.timingIncomplete, true);
    assert.equal(partial.stopReason, "aborted");
    assert.equal(partial.toolOutputChars, 4, "duplicate end must not duplicate output");

    // agent_start fallback and shutdown do not fabricate a normal completion.
    await at(400, "agent_start");
    await at(410, "session_shutdown", { reason: "exit" });
    assert.equal(latest().durationMs, 10);
    assert.equal(latest().timingIncomplete, true);
    assert.equal(latest().stopReason, undefined);
  } finally { process.hrtime.bigint = originalClock; }
  await emit("before_agent_start", { messageType: "user", prompt: secret, systemPrompt: "", systemPromptOptions: {} });
  for (const name of ["__proto__", "constructor"]) {
    await emit("tool_execution_start", start(name, name));
    await emit("tool_execution_end", end(name, name));
  }
  await emit("agent_settled", {});
  assert.equal(latest().tools.__proto__, 1, "counter names must not mutate prototypes");
  assert.equal(latest().tools.constructor, 1);
  assert.ok(!readFileSync(runsPath, "utf8").includes(secret), "new aggregates must not persist content");

  process.env.PI_PROFILE = "1";
  process.env.PI_PROFILE_OUT = join(root, "raw.jsonl");
  const rawHandlers = new Map();
  const rawAPI = {
    on(name, handler) { const list = rawHandlers.get(name) ?? []; list.push(handler); rawHandlers.set(name, list); },
    registerCommand() {},
  };
  loopProfiler(rawAPI);
  const emitRaw = async (name, event) => { for (const handler of rawHandlers.get(name) ?? []) await handler(event, ctx); };
  await emitRaw("before_agent_start", { messageType: "custom", message: { content: secret }, systemPrompt: secret, systemPromptOptions: {} });
  await emitRaw("agent_settled", {});
  assert.ok(!readFileSync(process.env.PI_PROFILE_OUT, "utf8").includes(secret));
  assert.equal(statSync(process.env.PI_PROFILE_OUT).mode & 0o777, 0o600);

  // Profiling I/O failure must not throw into the agent lifecycle or retain a stale run.
  rmSync(join(root, "observability"), { recursive: true });
  writeFileSync(join(root, "observability"), "block writes");
  const originalError = console.error, storageErrors = [];
  console.error = (...args) => storageErrors.push(args.join(" "));
  try {
    await emit("agent_start", {});
    await emit("agent_settled", {});
    assert.ok(storageErrors.some((error) => error.includes("Could not save aggregate metrics")));
    rawHandlers.clear();
    process.env.PI_PROFILE_OUT = join(root, "observability", "raw.jsonl");
    loopProfiler(rawAPI);
    await emitRaw("agent_start", {});
    await emitRaw("agent_settled", {});
    assert.ok(storageErrors.some((error) => error.includes("Could not save event trace")));
    rmSync(join(root, "observability"));
    await emit("agent_start", {});
    await emit("agent_settled", {});
    assert.equal(latest().trigger, "unknown", "recorder recovers after storage failure");
  } finally { console.error = originalError; }
  console.log("PASS custom starts, timing unions/overlap, nested boundaries, continuations, failures, cost, incomplete records, counter keys, private trace, I/O recovery and privacy");

  console.log("PASS loop profiler v4 privacy, retention, direct output split, indexed-receipt metrics, reports, and v1/v2/v3 readability");
} finally { rmSync(root, { recursive: true, force: true }); }
