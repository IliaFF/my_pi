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
writeFileSync(runsPath, `${Array.from({ length: 500 }, (_, i) => JSON.stringify({ version: 1, projectHash: "old", runId: `old-${i}` })).join("\n")}\n`);

try {
  const moduleUrl = pathToFileURL(join(process.cwd(), "local-extensions", "loop-profiler.ts")).href;
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
    type: "before_agent_start", prompt: secret, systemPrompt: `system-${secret}`,
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

  console.log("PASS loop profiler v4 privacy, retention, direct output split, indexed-receipt metrics, reports, and v1/v2/v3 readability");
} finally { rmSync(root, { recursive: true, force: true }); }
