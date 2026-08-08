#!/usr/bin/env node
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = mkdtempSync(join(tmpdir(), "pi-loop-profiler-test-"));
process.env.PI_CODING_AGENT_DIR = root;
process.env.PI_PROFILE = "0";
const runsPath = join(root, "observability", "loop-runs.jsonl");
mkdirSync(join(root, "observability"), { recursive: true });
const old = Array.from({ length: 500 }, (_, index) => JSON.stringify({ version: 1, projectHash: "old", runId: `old-${index}` }));
writeFileSync(runsPath, `${old.join("\n")}\n`);

try {
  const moduleUrl = pathToFileURL(join(process.cwd(), "local-extensions", "loop-profiler.ts")).href;
  const { default: loopProfiler, formatLoopReport } = await import(`${moduleUrl}?test=${Date.now()}`);
  const handlers = new Map();
  const commands = new Map();
  const notifications = [];
  const pi = {
    on(name, handler) {
      const list = handlers.get(name) ?? [];
      list.push(handler);
      handlers.set(name, list);
    },
    registerCommand(name, options) { commands.set(name, options); },
  };
  loopProfiler(pi);
  const ctx = {
    cwd: "/workspace/private-project",
    mode: "rpc",
    model: { provider: "test-provider", id: "test-model" },
    thinkingLevel: "medium",
    ui: { notify(message, type) { notifications.push({ message, type }); } },
  };
  const emit = async (name, event) => {
    for (const handler of handlers.get(name) ?? []) await handler(event, ctx);
  };
  const secret = "SECRET_PROMPT_AND_TOOL_PAYLOAD";
  await emit("before_agent_start", {
    type: "before_agent_start",
    prompt: secret,
    systemPrompt: `system-${secret}`,
    systemPromptOptions: { selectedTools: ["bash"], contextFiles: [], skills: [] },
  });
  await emit("turn_start", { type: "turn_start", turnIndex: 0, timestamp: Date.now() });
  await emit("context", { type: "context", messages: [{ role: "user", content: `${secret}${"x".repeat(1_000)}` }] });
  await emit("before_provider_request", { type: "before_provider_request", payload: { input: secret } });
  await emit("after_provider_response", { type: "after_provider_response", status: 200, headers: {} });
  await emit("message_update", {
    type: "message_update",
    message: { role: "assistant" },
    assistantMessageEvent: { type: "text_delta", delta: "x" },
  });
  await emit("tool_execution_start", { type: "tool_execution_start", toolCallId: "fabric-1", toolName: "fabric_exec", args: {} });
  await emit("tool_execution_start", { type: "tool_execution_start", toolCallId: "nested-read", toolName: "read", args: { path: "private" } });
  await emit("tool_execution_end", { type: "tool_execution_end", toolCallId: "nested-read", toolName: "read", result: { content: [] }, isError: false });
  await emit("tool_execution_start", {
    type: "tool_execution_start",
    toolCallId: "nested-bash",
    toolName: "bash",
    args: { command: `pytest -q # ${secret}` },
  });
  await emit("tool_execution_end", {
    type: "tool_execution_end",
    toolCallId: "nested-bash",
    toolName: "bash",
    result: { content: [{ type: "text", text: secret }] },
    isError: true,
  });
  await emit("tool_execution_end", { type: "tool_execution_end", toolCallId: "fabric-1", toolName: "fabric_exec", result: { content: [] }, isError: false });
  await emit("turn_end", { type: "turn_end", turnIndex: 0, message: {}, toolResults: [{}] });
  await emit("turn_start", { type: "turn_start", turnIndex: 1, timestamp: Date.now() });
  await emit("tool_execution_start", { type: "tool_execution_start", toolCallId: "direct-edit", toolName: "edit", args: {} });
  await emit("tool_execution_end", { type: "tool_execution_end", toolCallId: "direct-edit", toolName: "edit", result: { content: [] }, isError: false });
  await emit("message_end", {
    type: "message_end",
    message: { role: "assistant", content: [], usage: { input: 10, output: 2, cacheRead: 90, cacheWrite: 0 } },
  });
  await emit("turn_end", { type: "turn_end", turnIndex: 1, message: {}, toolResults: [{}] });
  await emit("agent_settled", { type: "agent_settled" });

  const persisted = readFileSync(runsPath, "utf8");
  if (persisted.includes(secret)) throw new Error("sensitive content persisted");
  const lines = persisted.trim().split("\n");
  if (lines.length !== 500) throw new Error(`retention mismatch: ${lines.length}`);
  const run = JSON.parse(lines.at(-1));
  if (run.modelCalls !== 1 || run.toolCalls !== 4 || run.singleToolBatches !== 1 || run.parallelToolBatches !== 1) throw new Error("legacy round counters mismatch");
  if (run.fabricPrograms !== 1 || run.nestedOperations !== 2 || run.directToolCalls !== 1 || run.outerToolCalls !== 2) throw new Error("outer/nested counters mismatch");
  if (run.outerSingleToolBatches !== 2 || run.outerParallelToolBatches !== 0) throw new Error("outer batch counters mismatch");
  if (run.toolErrors !== 1 || run.nestedToolErrors !== 1 || run.outerToolErrors !== 0) throw new Error("boundary error counters mismatch");
  if (run.validationRounds !== 1 || run.toolOutputChars !== secret.length) throw new Error("validation/output counters mismatch");
  if (run.outerTools.fabric_exec !== 1 || run.outerTools.edit !== 1 || run.nestedTools.read !== 1 || run.nestedTools.bash !== 1) throw new Error("boundary tool maps mismatch");
  if (!run.runId || !run.projectHash || run.providerStatuses["200"] !== 1 || run.batchingPolicy !== "fabric-batching-v1") throw new Error("correlation/provider/policy fields missing");

  await commands.get("loop-report").handler("last", ctx);
  if (!notifications.at(-1)?.message.includes("Loop last") || !notifications.at(-1)?.message.includes("fabric 1") || !notifications.at(-1)?.message.includes("direct 1")) {
    throw new Error("loop report missing batching metrics");
  }
  await commands.get("loop-report").handler("batching", ctx);
  if (!notifications.at(-1)?.message.includes("Batching pilot") || !notifications.at(-1)?.message.includes("post-policy 1/10")) {
    throw new Error("batching pilot report missing progress");
  }
  const legacyReport = formatLoopReport([{ ...run, batchingPolicy: undefined }], "last");
  if (!legacyReport.includes("legacy record")) throw new Error("legacy report compatibility missing");
  if (!formatLoopReport([], "batching").includes("post-policy 0/10")) throw new Error("empty batching pilot progress missing");
  if (!formatLoopReport([run], "last").includes("durations outer") || !formatLoopReport([run], "last").includes("errors outer 0, nested 1")) throw new Error("boundary duration/error report missing");
  console.log("PASS loop profiler privacy, retention, outer/nested telemetry, policy cohort, and reports");
} finally {
  rmSync(root, { recursive: true, force: true });
}
