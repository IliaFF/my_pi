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
const BATCHING_POLICY = "fabric-batching-v1";
const PILOT_RUNS = 10;

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
  batchingPolicy?: string;
  fabricPrograms?: number;
  nestedOperations?: number;
  directToolCalls?: number;
  outerToolCalls?: number;
  outerSingleToolBatches?: number;
  outerParallelToolBatches?: number;
  outerToolErrors?: number;
  nestedToolErrors?: number;
  outerToolDurationMs?: number;
  nestedToolDurationMs?: number;
  outerTools?: Counter;
  nestedTools?: Counter;
  providerResponseMs: number;
  validationRounds: number;
  inspectTurns?: number;
  mutationBeforeInspect?: number;
  mutationTurns?: number;
  mutationValidationTurns?: number;
  mutationWithoutValidationTurns?: number;
  largeToolResults?: number;
  externalizedToolResults?: number;
  largeInlineToolResults?: number;
  containedNestedFailures?: number;
  propagatedFabricFailures?: number;
  validationReruns?: number;
  unchangedValidationReruns?: number;
  rootToolErrors?: number;
  wrapperToolErrors?: number;
  errorCategories?: Counter;
  payloadBytes: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  tools: Counter;
  transitions: Counter;
  providerStatuses: Counter;
};

type ToolBoundary = "fabric" | "nested" | "direct";
type ToolExecution = {
  startedNs: bigint;
  boundary: ToolBoundary;
  validationHash?: string;
  mutation: boolean;
};

type MutableRun = LoopRun & {
  startedNs: bigint;
  toolStartedNs: Map<string, ToolExecution>;
  activeFabricCalls: Set<string>;
  turnTools: string[];
  outerTurnTools: string[];
  previousTool?: string;
  requestStartedNs?: bigint;
  turnHasValidation: boolean;
  turnHasSearch: boolean;
  turnHasRead: boolean;
  turnHasMutation: boolean;
  mutationGeneration: number;
  validationGenerations: Map<string, number>;
  pendingFabricNestedErrors: number;
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
  const record = args as { command?: unknown; cmd?: unknown };
  const command = record.command ?? record.cmd;
  return typeof command === "string" && /(?:^|[;&|\n]\s*|\b)(?:pytest|python3?\s+-m\s+pytest|npm\s+(?:run\s+)?test|pnpm\s+(?:run\s+)?test|yarn\s+test|bun\s+test|cargo\s+test|go\s+test|(?:npx\s+)?tsc\b|(?:npx\s+)?eslint\b|ruff\b|verify\.sh\b|test-release\.py\b)/i.test(command);
}

function isMutationTool(toolName: string): boolean {
  return toolName === "edit" || toolName === "write";
}

function validationHash(toolName: string, args: unknown): string | undefined {
  if (!isValidationTool(toolName, args)) return undefined;
  const record = args as { command?: string; cmd?: string };
  const command = record.command ?? record.cmd ?? "";
  return createHash("sha256").update(command.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 16);
}

function contentText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map((item) => item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string" ? (item as { text: string }).text : "").join("\n");
}

function classifyError(value: unknown): string {
  const text = contentText(value).slice(0, 4_096);
  if (/Type errors; code was not executed/i.test(text)) return "guest_typecheck";
  if (/No overload matches|invalid arguments?|validation failed/i.test(text)) return "invalid_arguments";
  if (/anchor.*not found|old text.*not found/i.test(text)) return "anchor_missing";
  if (/command not found|is not recognized/i.test(text)) return "command_missing";
  if (/ENOENT|No such file|not found/i.test(text)) return "path_missing";
  if (/syntax error|unexpected token/i.test(text)) return "shell_syntax";
  if (/timed out|timeout/i.test(text)) return "timeout";
  if (/EACCES|permission denied/i.test(text)) return "permission";
  if (/tests? failed|AssertionError|\bFAIL\b/i.test(text)) return "test_failure";
  if (/ECONNRESET|ENETUNREACH|fetch failed/i.test(text)) return "network";
  if (/\b429\b|rate.?limit|overloaded/i.test(text)) return "provider";
  if (/cancelled|aborted|terminated/i.test(text)) return "cancelled";
  return "unknown";
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

function cohortSummary(label: string, runs: LoopRun[]): string {
  if (runs.length === 0) return `${label} 0: no eligible runs`;
  const modelCalls = runs.map((run) => run.modelCalls);
  const durations = runs.map((run) => run.durationMs);
  return `${label} ${runs.length}: model p50 ${percentile(modelCalls, 0.5)}, mean ${(modelCalls.reduce((a, b) => a + b, 0) / runs.length).toFixed(2)} · duration p50 ${formatDuration(percentile(durations, 0.5))}, mean ${formatDuration(durations.reduce((a, b) => a + b, 0) / runs.length)}`;
}

function formatBatchingReport(runs: LoopRun[]): string {
  const eligible = runs.filter((run) => run.modelCalls > 0 && run.contextChars >= 1_000);
  const baseline = eligible.filter((run) => !run.batchingPolicy).slice(-PILOT_RUNS);
  const policy = eligible.filter((run) => run.batchingPolicy === BATCHING_POLICY).slice(-PILOT_RUNS);
  const fabric = policy.reduce((total, run) => total + (run.fabricPrograms ?? 0), 0);
  const nested = policy.reduce((total, run) => total + (run.nestedOperations ?? 0), 0);
  const direct = policy.reduce((total, run) => total + (run.directToolCalls ?? 0), 0);
  const lines = [
    `Batching pilot · ${BATCHING_POLICY} · post-policy ${policy.length}/${PILOT_RUNS} real runs`,
    cohortSummary("baseline", baseline),
    cohortSummary("policy", policy),
    `policy boundaries: fabric ${fabric} · nested ${nested} (${fabric > 0 ? (nested / fabric).toFixed(2) : "0.00"}/fabric) · direct ${direct}`,
  ];
  if (policy.length < PILOT_RUNS) lines.push(`collecting: ${PILOT_RUNS - policy.length} more non-synthetic runs required before conclusion`);
  else if (baseline.length > 0) {
    const beforeCalls = baseline.reduce((sum, run) => sum + run.modelCalls, 0) / baseline.length;
    const afterCalls = policy.reduce((sum, run) => sum + run.modelCalls, 0) / policy.length;
    const beforeDuration = baseline.reduce((sum, run) => sum + run.durationMs, 0) / baseline.length;
    const afterDuration = policy.reduce((sum, run) => sum + run.durationMs, 0) / policy.length;
    lines.push(`before/after (task mix not randomized): model ${((afterCalls / beforeCalls - 1) * 100).toFixed(1)}% · duration ${((afterDuration / beforeDuration - 1) * 100).toFixed(1)}%`);
  }
  return lines.join("\n");
}

export function formatLoopReport(runs: LoopRun[], mode: "last" | "baseline" | "batching" = "last"): string {
  if (mode === "batching") return formatBatchingReport(runs);
  if (runs.length === 0) return `No loop baseline records yet. Recorder: ${RUNS_PATH}`;
  if (mode === "last") {
    const run = runs[runs.length - 1]!;
    const fabric = run.fabricPrograms ?? 0;
    const nested = run.nestedOperations ?? 0;
    const batching = run.batchingPolicy
      ? `batching ${run.batchingPolicy} · fabric ${fabric} · nested ${nested} (${fabric > 0 ? (nested / fabric).toFixed(2) : "0.00"}/fabric) · direct ${run.directToolCalls ?? 0}`
      : "batching legacy record: outer/nested unavailable";
    return [
      `Loop last · ${run.project} · ${formatDuration(run.durationMs)} · model ${run.modelCalls} · turns ${run.turns} · tools ${run.toolCalls}`,
      `TTFT ${formatDuration(run.ttftMs)} · provider headers ${formatDuration(run.providerResponseMs)} · validation rounds ${run.validationRounds ?? 0}`,
      batching,
      `outer ${run.outerToolCalls ?? 0} · batches single ${run.outerSingleToolBatches ?? 0}, parallel ${run.outerParallelToolBatches ?? 0}`,
      `durations outer ${formatDuration(run.outerToolDurationMs)}, nested ${formatDuration(run.nestedToolDurationMs)} · errors outer ${run.outerToolErrors ?? 0}, nested ${run.nestedToolErrors ?? 0}`,
      `efficiency inspect ${run.inspectTurns ?? 0} · mutation+validation ${run.mutationValidationTurns ?? 0}/${run.mutationTurns ?? 0} · unchanged validation reruns ${run.unchangedValidationReruns ?? 0}`,
      `evidence externalized ${run.externalizedToolResults ?? 0}/${run.largeToolResults ?? 0} · failures root ${run.rootToolErrors ?? run.toolErrors}, wrappers ${run.wrapperToolErrors ?? 0}, contained ${run.containedNestedFailures ?? 0} · categories ${topCounter(run.errorCategories ?? {})}`,
      `context ${run.contextMessages} msg/${run.contextChars} ch · tool output ${run.toolOutputChars} ch · payload ${run.payloadBytes} B`,
      `tokens in ${run.inputTokens} + cache ${run.cacheReadTokens} (${(cacheShare(run) * 100).toFixed(1)}%) · out ${run.outputTokens}`,
      `outer tools ${topCounter(run.outerTools ?? {})} · nested ${topCounter(run.nestedTools ?? {})}`,
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
      activeFabricCalls: _activeFabricCalls,
      turnTools: _turnTools,
      outerTurnTools: _outerTurnTools,
      previousTool: _previousTool,
      requestStartedNs: _requestStartedNs,
      turnHasValidation: _turnHasValidation,
      turnHasSearch: _turnHasSearch,
      turnHasRead: _turnHasRead,
      turnHasMutation: _turnHasMutation,
      mutationGeneration: _mutationGeneration,
      validationGenerations: _validationGenerations,
      pendingFabricNestedErrors: _pendingFabricNestedErrors,
      ...run
    } = current;
    run.durationMs = round(elapsedMs(startedNs));
    run.toolDurationMs = round(run.toolDurationMs);
    run.outerToolDurationMs = round(run.outerToolDurationMs ?? 0);
    run.nestedToolDurationMs = round(run.nestedToolDurationMs ?? 0);
    run.providerResponseMs = round(run.providerResponseMs);
    if (recordRuns) appendRun(run);
    current = undefined;
  };

  rawMark("profiler_loaded", { pid: process.pid, output: rawOutput, runs: RUNS_PATH, recordRuns });

  pi.registerCommand("loop-report", {
    description: "Show agent-loop metrics: /loop-report [last|baseline|batching]",
    handler: async (args, ctx) => {
      const requested = args.trim().toLowerCase();
      if (requested && requested !== "last" && requested !== "baseline" && requested !== "batching") {
        ctx.ui.notify("Usage: /loop-report last|baseline|batching", "warning");
        return;
      }
      const projectHash = createHash("sha256").update(ctx.cwd).digest("hex").slice(0, 12);
      const mode = requested === "baseline" ? "baseline" : requested === "batching" ? "batching" : "last";
      ctx.ui.notify(formatLoopReport(readRuns(projectHash), mode), "info");
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
      batchingPolicy: BATCHING_POLICY,
      fabricPrograms: 0,
      nestedOperations: 0,
      directToolCalls: 0,
      outerToolCalls: 0,
      outerSingleToolBatches: 0,
      outerParallelToolBatches: 0,
      outerToolErrors: 0,
      nestedToolErrors: 0,
      outerToolDurationMs: 0,
      nestedToolDurationMs: 0,
      outerTools: {},
      nestedTools: {},
      providerResponseMs: 0,
      validationRounds: 0,
      inspectTurns: 0,
      mutationBeforeInspect: 0,
      mutationTurns: 0,
      mutationValidationTurns: 0,
      mutationWithoutValidationTurns: 0,
      largeToolResults: 0,
      externalizedToolResults: 0,
      largeInlineToolResults: 0,
      containedNestedFailures: 0,
      propagatedFabricFailures: 0,
      validationReruns: 0,
      unchangedValidationReruns: 0,
      rootToolErrors: 0,
      wrapperToolErrors: 0,
      errorCategories: {},
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
      activeFabricCalls: new Set(),
      turnTools: [],
      outerTurnTools: [],
      turnHasValidation: false,
      turnHasSearch: false,
      turnHasRead: false,
      turnHasMutation: false,
      mutationGeneration: 0,
      validationGenerations: new Map(),
      pendingFabricNestedErrors: 0,
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
      current.outerTurnTools = [];
      current.turnHasValidation = false;
      current.turnHasSearch = false;
      current.turnHasRead = false;
      current.turnHasMutation = false;
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
    let boundary: ToolBoundary | undefined;
    if (current) {
      const nested = event.toolName !== "fabric_exec" && current.activeFabricCalls.size > 0;
      boundary = nested ? "nested" : event.toolName === "fabric_exec" ? "fabric" : "direct";
      const hash = validationHash(event.toolName, event.args);
      const mutation = isMutationTool(event.toolName);
      current.toolCalls += 1;
      current.turnTools.push(event.toolName);
      current.toolStartedNs.set(event.toolCallId, { startedNs: process.hrtime.bigint(), boundary, validationHash: hash, mutation });
      increment(current.tools, event.toolName);
      if (current.previousTool) increment(current.transitions, `${current.previousTool}->${event.toolName}`);
      current.previousTool = event.toolName;
      if (boundary === "nested") {
        current.nestedOperations = (current.nestedOperations ?? 0) + 1;
        increment(current.nestedTools ?? (current.nestedTools = {}), event.toolName);
      } else {
        current.outerToolCalls = (current.outerToolCalls ?? 0) + 1;
        current.outerTurnTools.push(event.toolName);
        increment(current.outerTools ?? (current.outerTools = {}), event.toolName);
        if (boundary === "fabric") {
          current.fabricPrograms = (current.fabricPrograms ?? 0) + 1;
          current.activeFabricCalls.add(event.toolCallId);
        } else current.directToolCalls = (current.directToolCalls ?? 0) + 1;
      }
      if (hash) current.turnHasValidation = true;
      if (event.toolName === "grep" || event.toolName === "find") current.turnHasSearch = true;
      if (event.toolName === "read") current.turnHasRead = true;
      if (mutation) {
        if (!current.turnHasSearch || !current.turnHasRead) current.mutationBeforeInspect = (current.mutationBeforeInspect ?? 0) + 1;
        current.turnHasMutation = true;
      }
    }
    rawMark("tool_start", { id: event.toolCallId, tool: event.toolName, boundary });
  });
  pi.on("tool_call", (event) => rawMark("tool_preflight", { id: event.toolCallId, tool: event.toolName }));
  pi.on("tool_execution_end", (event) => {
    let boundary: ToolBoundary | undefined;
    if (current) {
      const text = contentText(event.result?.content);
      const outputChars = text.length;
      current.toolOutputChars += outputChars;
      if (outputChars >= 32_768) {
        current.largeToolResults = (current.largeToolResults ?? 0) + 1;
        const externalized = text.includes("[Native fabric full output") || text.includes("Full output:");
        if (externalized) current.externalizedToolResults = (current.externalizedToolResults ?? 0) + 1;
        else current.largeInlineToolResults = (current.largeInlineToolResults ?? 0) + 1;
      }
      if (event.isError) current.toolErrors += 1;
      const execution = current.toolStartedNs.get(event.toolCallId);
      boundary = execution?.boundary;
      if (execution) {
        const duration = elapsedMs(execution.startedNs);
        current.toolDurationMs += duration;
        if (execution.boundary === "nested") {
          current.nestedToolDurationMs = (current.nestedToolDurationMs ?? 0) + duration;
          if (event.isError) {
            current.nestedToolErrors = (current.nestedToolErrors ?? 0) + 1;
            current.pendingFabricNestedErrors += 1;
            current.rootToolErrors = (current.rootToolErrors ?? 0) + 1;
            increment(current.errorCategories ?? (current.errorCategories = {}), classifyError(event.result?.content));
          }
        } else {
          current.outerToolDurationMs = (current.outerToolDurationMs ?? 0) + duration;
          if (event.isError) current.outerToolErrors = (current.outerToolErrors ?? 0) + 1;
          if (execution.boundary === "direct" && event.isError) {
            current.rootToolErrors = (current.rootToolErrors ?? 0) + 1;
            increment(current.errorCategories ?? (current.errorCategories = {}), classifyError(event.result?.content));
          }
        }
        if (execution.mutation && !event.isError) current.mutationGeneration += 1;
        if (execution.validationHash) {
          const previous = current.validationGenerations.get(execution.validationHash);
          if (previous !== undefined) {
            current.validationReruns = (current.validationReruns ?? 0) + 1;
            if (previous === current.mutationGeneration) current.unchangedValidationReruns = (current.unchangedValidationReruns ?? 0) + 1;
          }
          current.validationGenerations.set(execution.validationHash, current.mutationGeneration);
        }
        if (execution.boundary === "fabric") {
          current.activeFabricCalls.delete(event.toolCallId);
          if (event.isError && current.pendingFabricNestedErrors > 0) {
            current.wrapperToolErrors = (current.wrapperToolErrors ?? 0) + 1;
            current.propagatedFabricFailures = (current.propagatedFabricFailures ?? 0) + current.pendingFabricNestedErrors;
          } else if (event.isError) {
            current.rootToolErrors = (current.rootToolErrors ?? 0) + 1;
            increment(current.errorCategories ?? (current.errorCategories = {}), classifyError(event.result?.content));
          } else {
            current.containedNestedFailures = (current.containedNestedFailures ?? 0) + current.pendingFabricNestedErrors;
          }
          if (current.activeFabricCalls.size === 0) current.pendingFabricNestedErrors = 0;
        }
        current.toolStartedNs.delete(event.toolCallId);
      }
    }
    rawMark("tool_end", { id: event.toolCallId, tool: event.toolName, boundary, error: event.isError });
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
      const outerCount = current.outerTurnTools.length;
      if (outerCount === 1) current.outerSingleToolBatches = (current.outerSingleToolBatches ?? 0) + 1;
      if (outerCount > 1) current.outerParallelToolBatches = (current.outerParallelToolBatches ?? 0) + 1;
      if (current.turnHasValidation) current.validationRounds += 1;
      if (current.turnHasSearch && current.turnHasRead) current.inspectTurns = (current.inspectTurns ?? 0) + 1;
      if (current.turnHasMutation) {
        current.mutationTurns = (current.mutationTurns ?? 0) + 1;
        if (current.turnHasValidation) current.mutationValidationTurns = (current.mutationValidationTurns ?? 0) + 1;
        else current.mutationWithoutValidationTurns = (current.mutationWithoutValidationTurns ?? 0) + 1;
      }
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
