import { createHash } from "node:crypto";
import { appendFileSync, chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const VERSION = 1;
const AGENT_ROOT = resolve(process.env.PI_CODING_AGENT_DIR || join(process.env.HOME || "~", ".pi", "agent"));
const OBSERVABILITY_DIR = join(AGENT_ROOT, "observability");
const RUNS_PATH = process.env.PI_LOOP_RUNS_OUT || join(OBSERVABILITY_DIR, "loop-runs.jsonl");
const MAX_RUNS_BYTES = 5 * 1024 * 1024;
const MAX_RUNS = 500;

type Counter = Record<string, number>;
type LoopRun = {
  version: 1;
  timestamp: string;
  runId: string;
  project: string;
  projectHash: string;
  sessionHash?: string;
  provider?: string;
  model?: string;
  thinking?: string;
  durationMs: number;
  ttftMs?: number;
  promptChars: number;
  systemPromptChars: number;
  selectedTools: number;
  contextFiles: number;
  skills: number;
  contextMessages: number;
  contextChars: number;
  modelCalls: number;
  turns: number;
  toolCalls: number;
  singleToolBatches: number;
  parallelToolBatches: number;
  toolErrors: number;
  toolOutputChars: number;
  toolDurationMs: number;
  providerResponseMs: number;
  validationRounds: number;
  payloadBytes: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  tools: Counter;
  transitions: Counter;
  providerStatuses: Counter;
};

type MutableRun = LoopRun & {
  startedNs: bigint;
  toolStartedNs: Map<string, bigint>;
  turnTools: string[];
  previousTool?: string;
  requestStartedNs?: bigint;
  turnHasValidation: boolean;
};

function enabled(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return /^(1|true|yes|on)$/i.test(value);
}

function contentChars(value: unknown): number {
  if (typeof value === "string") return value.length;
  if (!Array.isArray(value)) return 0;
  return value.reduce((total, item) => {
    if (!item || typeof item !== "object") return total;
    const record = item as Record<string, unknown>;
    return total + (typeof record.text === "string" ? record.text.length : 0);
  }, 0);
}

function increment(counter: Counter, key: string, amount = 1): void {
  counter[key] = (counter[key] ?? 0) + amount;
}

function elapsedMs(startedNs: bigint): number {
  return Number(process.hrtime.bigint() - startedNs) / 1e6;
}

function round(value: number): number {
  return +value.toFixed(3);
}

function ensurePrivateDir(path: string): void {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
}

function atomicWrite(path: string, content: string): void {
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(temporary, content, { encoding: "utf8", mode: 0o600 });
  chmodSync(temporary, 0o600);
  renameSync(temporary, path);
}

function appendRun(run: LoopRun): void {
  ensurePrivateDir(dirname(RUNS_PATH));
  let lines: string[] = [];
  try {
    lines = readFileSync(RUNS_PATH, "utf8").split("\n").filter(Boolean);
  } catch {}
  lines.push(JSON.stringify(run));
  let retained = lines.slice(-MAX_RUNS);
  while (Buffer.byteLength(`${retained.join("\n")}\n`) > MAX_RUNS_BYTES && retained.length > 1) retained = retained.slice(1);
  atomicWrite(RUNS_PATH, `${retained.join("\n")}\n`);
}

function readRuns(projectHash?: string): LoopRun[] {
  try {
    return readFileSync(RUNS_PATH, "utf8")
      .split("\n")
      .filter(Boolean)
      .slice(-MAX_RUNS)
      .map((line) => JSON.parse(line) as LoopRun)
      .filter((run) => run.version === VERSION && (!projectHash || run.projectHash === projectHash));
  } catch {
    return [];
  }
}

function isValidationTool(toolName: string, args: unknown): boolean {
  if (toolName !== "bash" || !args || typeof args !== "object") return false;
  const command = (args as { command?: unknown }).command;
  return typeof command === "string" && /(?:^|[;&|\n]\s*|\b)(?:pytest|python3?\s+-m\s+pytest|npm\s+(?:run\s+)?test|pnpm\s+(?:run\s+)?test|yarn\s+test|bun\s+test|cargo\s+test|go\s+test|(?:npx\s+)?tsc\b|(?:npx\s+)?eslint\b|ruff\b|verify\.sh\b|test-release\.py\b)/i.test(command);
}

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * fraction))] ?? 0;
}

function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return "n/a";
  if (ms < 1_000) return `${Math.round(ms)}ms`;
  return `${(ms / 1_000).toFixed(ms < 10_000 ? 2 : 1)}s`;
}

function cacheShare(run: LoopRun): number {
  const total = run.inputTokens + run.cacheReadTokens;
  return total > 0 ? run.cacheReadTokens / total : 0;
}

function topCounter(counter: Counter, limit = 5): string {
  return Object.entries(counter)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, value]) => `${key}:${value}`)
    .join(", ") || "none";
}

export function formatLoopReport(runs: LoopRun[], mode: "last" | "baseline" = "last"): string {
  if (runs.length === 0) return `No loop baseline records yet. Recorder: ${RUNS_PATH}`;
  if (mode === "last") {
    const run = runs[runs.length - 1]!;
    return [
      `Loop last · ${run.project} · ${formatDuration(run.durationMs)} · model ${run.modelCalls} · turns ${run.turns} · tools ${run.toolCalls}`,
      `TTFT ${formatDuration(run.ttftMs)} · provider headers ${formatDuration(run.providerResponseMs)} · validation rounds ${run.validationRounds ?? 0}`,
      `batches single ${run.singleToolBatches}, parallel ${run.parallelToolBatches} · errors ${run.toolErrors}`,
      `context ${run.contextMessages} msg/${run.contextChars} ch · tool output ${run.toolOutputChars} ch · payload ${run.payloadBytes} B`,
      `tokens in ${run.inputTokens} + cache ${run.cacheReadTokens} (${(cacheShare(run) * 100).toFixed(1)}%) · out ${run.outputTokens}`,
      `tools ${topCounter(run.tools)} · transitions ${topCounter(run.transitions)}`,
    ].join("\n");
  }
  const modelCalls = runs.map((run) => run.modelCalls);
  const toolCalls = runs.map((run) => run.toolCalls);
  const durations = runs.map((run) => run.durationMs);
  const totals = runs.reduce((sum, run) => ({
    single: sum.single + run.singleToolBatches,
    parallel: sum.parallel + run.parallelToolBatches,
    input: sum.input + run.inputTokens,
    cache: sum.cache + run.cacheReadTokens,
    output: sum.output + run.outputTokens,
    tools: sum.tools + run.toolCalls,
    errors: sum.errors + run.toolErrors,
    validation: sum.validation + (run.validationRounds ?? 0),
    providerResponse: sum.providerResponse + (run.providerResponseMs ?? 0),
  }), { single: 0, parallel: 0, input: 0, cache: 0, output: 0, tools: 0, errors: 0, validation: 0, providerResponse: 0 });
  const cacheTotal = totals.input + totals.cache;
  return [
    `Loop baseline · ${runs.length} runs · recorder ${RUNS_PATH}`,
    `model calls p50 ${percentile(modelCalls, 0.5)}, p90 ${percentile(modelCalls, 0.9)}, mean ${(modelCalls.reduce((a, b) => a + b, 0) / runs.length).toFixed(2)}`,
    `tool calls p50 ${percentile(toolCalls, 0.5)}, p90 ${percentile(toolCalls, 0.9)}, mean ${(toolCalls.reduce((a, b) => a + b, 0) / runs.length).toFixed(2)}`,
    `duration p50 ${formatDuration(percentile(durations, 0.5))}, p90 ${formatDuration(percentile(durations, 0.9))}`,
    `batches single ${totals.single}, parallel ${totals.parallel} · validation rounds ${totals.validation} · tool errors ${totals.errors}/${totals.tools}`,
    `provider headers mean ${formatDuration(totals.providerResponse / runs.length)} · cache read share ${cacheTotal > 0 ? ((totals.cache / cacheTotal) * 100).toFixed(1) : "0.0"}% · output tokens ${totals.output}`,
  ].join("\n");
}

// Persistent aggregate recorder is on by default. Detailed event trace remains opt-in: PI_PROFILE=1.
export default function loopProfiler(pi: ExtensionAPI): void {
  const recordRuns = enabled(process.env.PI_LOOP_RECORD, true);
  const rawEnabled = enabled(process.env.PI_PROFILE, false);
  const rawOutput = process.env.PI_PROFILE_OUT ?? `/tmp/pi-profile-${process.pid}.jsonl`;
  const processStartedNs = process.hrtime.bigint();
  let rawRecords: Record<string, unknown>[] = [];
  let current: MutableRun | undefined;
  let runSequence = 0;
  let rawTurn = -1;
  let rawRequest = 0;
  let rawFirstDelta = false;

  const rawMark = (event: string, data: Record<string, unknown> = {}) => {
    if (!rawEnabled) return;
    rawRecords.push({ event, t_ms: round(elapsedMs(processStartedNs)), run: runSequence, turn: rawTurn, request: rawRequest, ...data });
  };
  const flushRaw = () => {
    if (!rawEnabled || rawRecords.length === 0) return;
    mkdirSync(dirname(rawOutput), { recursive: true });
    appendFileSync(rawOutput, `${rawRecords.map((record) => JSON.stringify(record)).join("\n")}\n`);
    rawRecords = [];
  };
  const finalize = () => {
    if (!current) return;
    const {
      startedNs,
      toolStartedNs: _toolStartedNs,
      turnTools: _turnTools,
      previousTool: _previousTool,
      requestStartedNs: _requestStartedNs,
      turnHasValidation: _turnHasValidation,
      ...run
    } = current;
    run.durationMs = round(elapsedMs(startedNs));
    run.toolDurationMs = round(run.toolDurationMs);
    run.providerResponseMs = round(run.providerResponseMs);
    if (recordRuns) appendRun(run);
    current = undefined;
  };

  rawMark("profiler_loaded", { pid: process.pid, output: rawOutput, runs: RUNS_PATH, recordRuns });

  pi.registerCommand("loop-report", {
    description: "Show last or baseline agent-loop metrics: /loop-report [last|baseline]",
    handler: async (args, ctx) => {
      const requested = args.trim().toLowerCase();
      if (requested && requested !== "last" && requested !== "baseline") {
        ctx.ui.notify("Usage: /loop-report last|baseline", "warning");
        return;
      }
      const projectHash = createHash("sha256").update(ctx.cwd).digest("hex").slice(0, 12);
      ctx.ui.notify(formatLoopReport(readRuns(projectHash), requested === "baseline" ? "baseline" : "last"), "info");
    },
  });

  pi.on("session_start", (event, ctx) => rawMark("session_start", {
    reason: event.reason,
    mode: ctx.mode,
    provider: ctx.model?.provider,
    model: ctx.model?.id,
    thinking: ctx.thinkingLevel,
  }));
  pi.on("input", (event) => rawMark("input", { source: event.source, chars: event.text.length }));
  pi.on("before_agent_start", (event, ctx) => {
    finalize();
    runSequence += 1;
    rawTurn = -1;
    rawRequest = 0;
    rawFirstDelta = false;
    const startedNs = process.hrtime.bigint();
    const project = basename(ctx.cwd) || "project";
    current = {
      version: VERSION,
      timestamp: new Date().toISOString(),
      runId: `${Date.now().toString(36)}-${process.pid}-${runSequence}`,
      project,
      projectHash: createHash("sha256").update(ctx.cwd).digest("hex").slice(0, 12),
      sessionHash: createHash("sha256").update(String(ctx.sessionManager?.getSessionId?.() || ctx.sessionManager?.getSessionFile?.() || "ephemeral")).digest("hex").slice(0, 16),
      provider: ctx.model?.provider,
      model: ctx.model?.id,
      thinking: ctx.thinkingLevel,
      durationMs: 0,
      promptChars: event.prompt.length,
      systemPromptChars: event.systemPrompt.length,
      selectedTools: event.systemPromptOptions.selectedTools?.length ?? 0,
      contextFiles: event.systemPromptOptions.contextFiles?.length ?? 0,
      skills: event.systemPromptOptions.skills?.length ?? 0,
      contextMessages: 0,
      contextChars: 0,
      modelCalls: 0,
      turns: 0,
      toolCalls: 0,
      singleToolBatches: 0,
      parallelToolBatches: 0,
      toolErrors: 0,
      toolOutputChars: 0,
      toolDurationMs: 0,
      providerResponseMs: 0,
      validationRounds: 0,
      payloadBytes: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      tools: {},
      transitions: {},
      providerStatuses: {},
      startedNs,
      toolStartedNs: new Map(),
      turnTools: [],
      turnHasValidation: false,
    };
    rawMark("before_agent_start", {
      prompt_chars: event.prompt.length,
      system_prompt_chars: event.systemPrompt.length,
      selected_tools: event.systemPromptOptions.selectedTools?.length ?? 0,
      context_files: event.systemPromptOptions.contextFiles?.length ?? 0,
      skills: event.systemPromptOptions.skills?.length ?? 0,
      tool_names: event.systemPromptOptions.selectedTools,
      skill_names: event.systemPromptOptions.skills?.map((skill) => skill.name),
    });
  });
  pi.on("agent_start", () => rawMark("agent_start"));
  pi.on("turn_start", (event) => {
    rawTurn = event.turnIndex;
    if (current) {
      current.turnTools = [];
      current.turnHasValidation = false;
    }
    rawMark("turn_start");
  });
  pi.on("context", (event) => {
    const chars = event.messages.reduce((total, message) => total + contentChars((message as { content?: unknown }).content), 0);
    if (current) {
      current.contextMessages = Math.max(current.contextMessages, event.messages.length);
      current.contextChars = Math.max(current.contextChars, chars);
    }
    rawMark("context_ready", { messages: event.messages.length, content_chars: chars });
  });
  pi.on("before_provider_headers", () => rawMark("provider_headers_ready"));
  pi.on("before_provider_request", (event) => {
    rawRequest += 1;
    rawFirstDelta = false;
    let payloadBytes = 0;
    let toolSchemaBytes: Array<{ name: string; bytes: number }> | undefined;
    try {
      payloadBytes = Buffer.byteLength(JSON.stringify(event.payload));
      const tools = (event.payload as { tools?: unknown[] } | undefined)?.tools;
      if (Array.isArray(tools)) {
        toolSchemaBytes = tools.map((tool) => {
          const value = tool as { name?: string; function?: { name?: string }; type?: string };
          return { name: value?.name ?? value?.function?.name ?? value?.type ?? "unknown", bytes: Buffer.byteLength(JSON.stringify(tool)) };
        }).sort((a, b) => b.bytes - a.bytes);
      }
    } catch {}
    if (current) {
      current.modelCalls += 1;
      current.payloadBytes = Math.max(current.payloadBytes, payloadBytes);
      current.requestStartedNs = process.hrtime.bigint();
    }
    rawMark("provider_request", { payload_bytes: payloadBytes, tool_schema_bytes: toolSchemaBytes });
  });
  pi.on("after_provider_response", (event) => {
    if (current) {
      increment(current.providerStatuses, String(event.status));
      if (current.requestStartedNs) current.providerResponseMs += elapsedMs(current.requestStartedNs);
      current.requestStartedNs = undefined;
    }
    rawMark("provider_response", { status: event.status });
  });
  pi.on("message_update", (event) => {
    if (event.message.role !== "assistant" || rawFirstDelta) return;
    const kind = event.assistantMessageEvent?.type;
    if (kind === "text_delta" || kind === "thinking_delta" || kind === "toolcall_delta") {
      rawFirstDelta = true;
      if (current && current.ttftMs === undefined) current.ttftMs = round(elapsedMs(current.startedNs));
      rawMark("first_assistant_delta", { kind });
    }
  });
  pi.on("tool_execution_start", (event) => {
    if (current) {
      current.toolCalls += 1;
      current.turnTools.push(event.toolName);
      current.toolStartedNs.set(event.toolCallId, process.hrtime.bigint());
      increment(current.tools, event.toolName);
      if (current.previousTool) increment(current.transitions, `${current.previousTool}->${event.toolName}`);
      current.previousTool = event.toolName;
      if (isValidationTool(event.toolName, event.args)) current.turnHasValidation = true;
    }
    rawMark("tool_start", { id: event.toolCallId, tool: event.toolName });
  });
  pi.on("tool_call", (event) => rawMark("tool_preflight", { id: event.toolCallId, tool: event.toolName }));
  pi.on("tool_execution_end", (event) => {
    if (current) {
      current.toolOutputChars += contentChars(event.result?.content);
      if (event.isError) current.toolErrors += 1;
      const started = current.toolStartedNs.get(event.toolCallId);
      if (started) current.toolDurationMs += elapsedMs(started);
      current.toolStartedNs.delete(event.toolCallId);
    }
    rawMark("tool_end", { id: event.toolCallId, tool: event.toolName, error: event.isError });
  });
  pi.on("message_end", (event) => {
    if (event.message.role !== "assistant") return;
    const message = event.message as typeof event.message & { usage?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number } };
    const usage = message.usage;
    if (current && usage) {
      current.inputTokens += usage.input ?? 0;
      current.outputTokens += usage.output ?? 0;
      current.cacheReadTokens += usage.cacheRead ?? 0;
      current.cacheWriteTokens += usage.cacheWrite ?? 0;
    }
    rawMark("assistant_message_end", {
      chars: contentChars((event.message as { content?: unknown }).content),
      input_tokens: usage?.input,
      output_tokens: usage?.output,
      cache_read_tokens: usage?.cacheRead,
      cache_write_tokens: usage?.cacheWrite,
    });
  });
  pi.on("turn_end", (event) => {
    if (current) {
      current.turns += 1;
      const count = current.turnTools.length || event.toolResults.length;
      if (count === 1) current.singleToolBatches += 1;
      if (count > 1) current.parallelToolBatches += 1;
      if (current.turnHasValidation) current.validationRounds += 1;
    }
    rawMark("turn_end", { tools: event.toolResults.length });
  });
  pi.on("agent_end", () => rawMark("agent_end"));
  pi.on("agent_settled", () => {
    rawMark("agent_settled");
    finalize();
    flushRaw();
  });
  pi.on("session_shutdown", (event) => {
    rawMark("session_shutdown", { reason: event.reason });
    finalize();
    flushRaw();
  });
}
