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
  const { default: loopProfiler } = await import(`${moduleUrl}?test=${Date.now()}`);
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
  await emit("context", { type: "context", messages: [{ role: "user", content: secret }] });
  await emit("before_provider_request", { type: "before_provider_request", payload: { input: secret } });
  await emit("after_provider_response", { type: "after_provider_response", status: 200, headers: {} });
  await emit("message_update", {
    type: "message_update",
    message: { role: "assistant" },
    assistantMessageEvent: { type: "text_delta", delta: "x" },
  });
  await emit("tool_execution_start", {
    type: "tool_execution_start",
    toolCallId: "call-1",
    toolName: "bash",
    args: { command: `pytest -q # ${secret}` },
  });
  await emit("tool_execution_end", {
    type: "tool_execution_end",
    toolCallId: "call-1",
    toolName: "bash",
    result: { content: [{ type: "text", text: secret }] },
    isError: false,
  });
  await emit("message_end", {
    type: "message_end",
    message: { role: "assistant", content: [], usage: { input: 10, output: 2, cacheRead: 90, cacheWrite: 0 } },
  });
  await emit("turn_end", { type: "turn_end", turnIndex: 0, message: {}, toolResults: [{}] });
  await emit("agent_settled", { type: "agent_settled" });

  const persisted = readFileSync(runsPath, "utf8");
  if (persisted.includes(secret)) throw new Error("sensitive content persisted");
  const lines = persisted.trim().split("\n");
  if (lines.length !== 500) throw new Error(`retention mismatch: ${lines.length}`);
  const run = JSON.parse(lines.at(-1));
  if (run.modelCalls !== 1 || run.toolCalls !== 1 || run.singleToolBatches !== 1) throw new Error("round counters mismatch");
  if (run.validationRounds !== 1 || run.toolOutputChars !== secret.length) throw new Error("validation/output counters mismatch");
  if (!run.runId || !run.projectHash || run.providerStatuses["200"] !== 1) throw new Error("correlation/provider counters missing");

  await commands.get("loop-report").handler("last", ctx);
  if (!notifications.at(-1)?.message.includes("Loop last") || !notifications.at(-1)?.message.includes("validation rounds 1")) {
    throw new Error("loop report missing expected metrics");
  }
  console.log("PASS loop profiler persistence, privacy, retention, counters, report");
} finally {
  rmSync(root, { recursive: true, force: true });
}
