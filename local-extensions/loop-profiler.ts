import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, chmodSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import type { BeforeAgentStartEvent, ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const VERSION = 4;
const AGENT_ROOT = resolve(process.env.PI_CODING_AGENT_DIR || join(process.env.HOME || "~", ".pi", "agent"));
const OBSERVABILITY_DIR = join(AGENT_ROOT, "observability");
const RUNS_PATH = process.env.PI_LOOP_RUNS_OUT || join(OBSERVABILITY_DIR, "loop-runs.jsonl");
const MAX_RUNS_BYTES = 5 * 1024 * 1024;
const MAX_RUNS = 500;
const BATCHING_POLICY = "searchable-context-v4";
const PILOT_RUNS = 10;

type Counter = Record<string, number>;
type LoopRun = {
  version: 1 | 2 | 3 | 4;
  timestamp: string;
  runId: string;
  project: string;
  projectHash: string;
  sessionHash?: string;
  provider?: string;
  model?: string;
  thinking?: string;
  durationMs: number;
  endedAt?: string;
  measurementVersion?: 1;
  pilotId?: string;
  pilotPhase?: PilotPhase;
  pilotGuidanceApplied?: boolean;
  checkSignatures?: string[];
  codeMutationCount?: number;
  codeWriteAttempts?: number;
  checkPasses?: number;
  checkFailures?: number;
  lastCheckResult?: "passed" | "failed";
  checksCoverFinalWrites?: boolean;
  trackedTaskIds?: string[];
  completedTaskIds?: string[];
  blockedTaskIds?: string[];
  ttftMs?: number;
  inputToStartMs?: number;
  trigger?: "user" | "custom" | "unknown";
  modelPhaseMs?: number;
  activeToolMs?: number;
  otherMs?: number;
  phaseOverlapMs?: number;
  timingIncomplete?: boolean;
  toolMsByName?: Counter;
  failedToolMsByName?: Counter;
  nestedToolCalls?: number;
  costUsd?: number;
  stopReason?: string;
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
  modelContextToolOutputChars?: number;
  fabricContextOutputChars?: number;
  directContextOutputChars?: number;
  nestedToolOutputChars?: number;
  modelContextToolOutputImages?: number;
  nestedToolOutputImages?: number;
  contextOutputByTool?: Counter;
  nestedOutputByTool?: Counter;
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
  fabricProgramsZeroNested?: number;
  fabricProgramsSingleNested?: number;
  fabricProgramsMultiNested?: number;
  fabricProgramsFivePlusNested?: number;
  fabricProgramMaxNested?: number;
  fabricProgramNestedHistogram?: Counter;
  ambiguousNestedAttribution?: number;
  contextLargeToolResults?: number;
  nestedLargeToolResults?: number;
  contextExternalizedToolResults?: number;
  contextIndexedToolResults?: number;
  externalizedOriginalChars?: number;
  externalizedReturnedChars?: number;
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

type ToolExecution = {
  startedNs: bigint;
  validationHash?: string;
  mutation: boolean;
  nested: boolean;
  codeMutation: boolean;
  checks: string[];
  writeEpoch: number;
  racedMutation: boolean;
};

type MutableRun = LoopRun & {
  startedNs: bigint;
  lastTimingNs: bigint;
  modelActive: boolean;
  toolStartedNs: Map<string, ToolExecution>;
  turnTools: string[];
  outerTurnTools: string[];
  previousTool?: string;
  requestStartedNs?: bigint;
  turnHasValidation: boolean;
  turnHasSearch: boolean;
  turnHasRead: boolean;
  turnHasMutation: boolean;
  mutationGeneration: number;
  writeEpoch: number;
  validationGenerations: Map<string, number>;
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

function contentImages(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.reduce((total, item) => {
    if (!item || typeof item !== "object") return total;
    return total + ((item as Record<string, unknown>).type === "image" ? 1 : 0);
  }, 0);
}

function increment(counter: Counter, key: string, amount = 1): void {
  const previous = Object.hasOwn(counter, key) ? counter[key]! : 0;
  Object.defineProperty(counter, key, { value: previous + amount, writable: true, enumerable: true, configurable: true });
}

function elapsedMs(startedNs: bigint): number {
  return Number(process.hrtime.bigint() - startedNs) / 1e6;
}

function accountTiming(run: MutableRun): void {
  const now = process.hrtime.bigint();
  const ms = Number(now - run.lastTimingNs) / 1e6;
  const toolsActive = run.toolStartedNs.size > 0;
  if (run.modelActive) run.modelPhaseMs = (run.modelPhaseMs ?? 0) + ms;
  if (toolsActive) run.activeToolMs = (run.activeToolMs ?? 0) + ms;
  if (run.modelActive && toolsActive) run.phaseOverlapMs = (run.phaseOverlapMs ?? 0) + ms;
  if (!run.modelActive && !toolsActive) run.otherMs = (run.otherMs ?? 0) + ms;
  run.lastTimingNs = now;
}

function executionKey(event: { toolCallId: string; toolName: string; parentToolCallId?: string }): string {
  return JSON.stringify([event.toolCallId, event.toolName, event.parentToolCallId ?? null]);
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
      .filter((run) => run.version >= 1 && run.version <= VERSION && (!projectHash || run.projectHash === projectHash));
  } catch {
    return [];
  }
}

function isValidationTool(toolName: string, args: unknown): boolean {
  if (toolName !== "bash" || !args || typeof args !== "object") return false;
  const record = args as { command?: unknown; cmd?: unknown };
  const command = record.command ?? record.cmd;
  return typeof command === "string" && /(?:^|[;&|\n]\s*|\b)(?:pytest|python3?\s+-m\s+pytest|npm\s+(?:run\s+)?test|pnpm\s+(?:run\s+)?test|yarn\s+test|bun\s+test|cargo\s+test|go\s+test|node\s+(?:--test\b|[^\s;&|]*test[-_.][^\s;&|]*)|python3?\s+[^\s;&|]*test[-_.][^\s;&|]*\.py|(?:npx\s+)?tsc\b|(?:npx\s+)?eslint\b|ruff\b|verify\.sh\b|test-release\.py\b)/i.test(command);
}

function observedChecks(toolName: string, args: unknown): string[] {
  if (!isValidationTool(toolName, args)) return [];
  const record = args as { command?: string; cmd?: string };
  const command = (record.command ?? record.cmd ?? "").replace(/#[^\n]*/g, "").trim();
  // Conservative shell subset: quoted bodies, masking failures and arbitrary wrappers stay unknown.
  if (/["'`$(){}|]|<<|(?<!&)&(?!&)|\b(?:if|for|while|until|trap|eval|source)\b/.test(command)) return [];
  if (/[;\n]/.test(command) && !/^set\s+-[a-z]*e/.test(command)) return [];
  const segments = command.split(/&&|[;\n]/).map((s) => s.trim()).filter(Boolean);
  const checks: string[] = [];
  for (const segment of segments) {
    if (/^cd\s+\S+$/.test(segment) || /^set\s+-[a-z]*e[a-z]*(?:\s+pipefail)?$/.test(segment)) continue;
    if (!/^(?:pytest\b|python3?\s+(?:-m\s+pytest\b|\S*test[-_.]\S*\.py\b)|(?:npm|pnpm)\s+(?:run\s+)?test\b|(?:yarn|bun|cargo|go)\s+test\b|node\s+(?:--test\b|[^\s;&|]*test[-_.][^\s;&|]*)|(?:npx\s+)?(?:tsc|eslint)\b|ruff\b|\.?\/\S*(?:verify\.sh|test-release\.py)\b)/i.test(segment)) return [];
    checks.push(createHash("sha256").update(segment.replace(/\s+/g, " ")).digest("hex").slice(0, 16));
  }
  return checks;
}
function isCodeMutation(toolName: string, args: unknown): boolean {
  if (!isMutationTool(toolName) || !args || typeof args !== "object") return false;
  const path = (args as { path?: unknown }).path;
  return typeof path === "string" && /(?:\.(?:[cm]?[jt]sx?|py|rs|go|java|c|cc|cpp|h|hpp|sh|json|toml|ya?ml|sql|ipynb)|(?:^|[/\\])(?:Dockerfile|Makefile))$/i.test(path);
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

function outputSummary(run: LoopRun): string {
  if (run.modelContextToolOutputChars === undefined) return `tool output legacy mixed ${run.toolOutputChars} ch (context split unavailable)`;
  if (run.batchingPolicy === BATCHING_POLICY) return `tool context output ${run.modelContextToolOutputChars} ch (direct ${run.directContextOutputChars ?? 0}) · indexed receipts ${run.contextIndexedToolResults ?? 0} · images ${run.modelContextToolOutputImages ?? 0}`;
  const nested = run.nestedToolOutputChars ?? 0;
  const fabric = run.fabricContextOutputChars ?? 0;
  const projection = nested > 0 ? `${(fabric / nested * 100).toFixed(1)}%` : "n/a";
  return `tool context output ${run.modelContextToolOutputChars} ch (direct ${run.directContextOutputChars ?? 0}, Fabric ${fabric}) · nested produced ${nested} ch · Fabric projection ${projection} · images context ${run.modelContextToolOutputImages ?? 0}, nested ${run.nestedToolOutputImages ?? 0}`;
}

function programSizeSummary(run: LoopRun): string {
  if (run.batchingPolicy === BATCHING_POLICY) return `Searchable context policy · indexed receipts ${run.contextIndexedToolResults ?? 0}`;
  if (run.fabricProgramNestedHistogram === undefined) return "Fabric program sizes unavailable (legacy record)";
  return `Fabric program sizes 0:${run.fabricProgramsZeroNested ?? 0}, 1:${run.fabricProgramsSingleNested ?? 0}, 2+:${run.fabricProgramsMultiNested ?? 0}, 5+:${run.fabricProgramsFivePlusNested ?? 0} · max ${run.fabricProgramMaxNested ?? 0} · ambiguous attribution ${run.ambiguousNestedAttribution ?? 0}`;
}

function cohortSummary(label: string, runs: LoopRun[]): string {
  if (runs.length === 0) return `${label} 0: no eligible runs`;
  const modelCalls = runs.map((run) => run.modelCalls);
  const durations = runs.map((run) => run.durationMs);
  return `${label} ${runs.length}: model p50 ${percentile(modelCalls, 0.5)}, mean ${(modelCalls.reduce((a, b) => a + b, 0) / runs.length).toFixed(2)} · duration p50 ${formatDuration(percentile(durations, 0.5))}, mean ${formatDuration(durations.reduce((a, b) => a + b, 0) / runs.length)}`;
}

function formatBatchingReport(runs: LoopRun[]): string {
  const eligible = runs.filter((run) => run.modelCalls > 0 && run.contextChars >= 1_000);
  const baseline = eligible.filter((run) => run.batchingPolicy !== BATCHING_POLICY).slice(-PILOT_RUNS);
  const policy = eligible.filter((run) => run.batchingPolicy === BATCHING_POLICY).slice(-PILOT_RUNS);
  const direct = policy.reduce((total, run) => total + (run.directToolCalls ?? 0), 0);
  const indexed = policy.reduce((total, run) => total + (run.contextIndexedToolResults ?? 0), 0);
  const telemetry = policy.filter((run) => run.modelContextToolOutputChars !== undefined);
  const contextOutput = telemetry.reduce((total, run) => total + (run.modelContextToolOutputChars ?? 0), 0);

  const lines = [
    `Searchable context pilot · ${BATCHING_POLICY} · post-policy ${policy.length}/${PILOT_RUNS} real runs`,
    cohortSummary("baseline", baseline),
    cohortSummary("policy", policy),
    `policy boundaries: direct ${direct}`,
    `policy output (${telemetry.length}/${policy.length} v4): context ${contextOutput} ch · indexed receipts ${indexed}`,
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
    const directPolicy = run.batchingPolicy === BATCHING_POLICY;
    const fabric = run.fabricPrograms ?? 0;
    const nested = run.nestedOperations ?? 0;
    const batching = directPolicy
      ? `policy ${run.batchingPolicy} · direct ${run.directToolCalls ?? 0} · indexed receipts ${run.contextIndexedToolResults ?? 0}`
      : run.batchingPolicy ? `legacy batching ${run.batchingPolicy} · fabric ${fabric} · nested ${nested} (${fabric > 0 ? (nested / fabric).toFixed(2) : "0.00"}/fabric) · direct ${run.directToolCalls ?? 0}` : "batching legacy record: outer/nested unavailable";
    const common = [
      `Loop last · ${run.project} · ${formatDuration(run.durationMs)} · model ${run.modelCalls} · turns ${run.turns} · tools ${run.toolCalls}`,
      `TTFT ${formatDuration(run.ttftMs)} · provider headers ${formatDuration(run.providerResponseMs)} · validation rounds ${run.validationRounds ?? 0}`,
      batching,
      `direct ${run.directToolCalls ?? 0} · batches single ${run.outerSingleToolBatches ?? 0}, parallel ${run.outerParallelToolBatches ?? 0}`,
      `duration tools ${formatDuration(run.outerToolDurationMs)} · errors ${run.outerToolErrors ?? 0}`,
      ...(run.modelPhaseMs === undefined ? [] : [
        `timing model phase ${formatDuration(run.modelPhaseMs)} · active tools ${formatDuration(run.activeToolMs)} · other ${formatDuration(run.otherMs)} · overlap ${formatDuration(run.phaseOverlapMs)}${run.timingIncomplete ? " · incomplete" : ""}`,
        `input preparation ${formatDuration(run.inputToStartMs)} (before run, excluded from duration/TTFT)`,
        `slow tools (cumulative ms, overlaps included) ${topCounter(run.toolMsByName ?? {})}`,
        `checks pass/fail ${run.checkPasses ?? "unknown"}/${run.checkFailures ?? "unknown"} · final code writes checked ${run.measurementVersion === 1 ? (run.checksCoverFinalWrites ? "observed" : "not observed") : "unknown"}`,
        `failed tools (cumulative ms) ${topCounter(run.failedToolMsByName ?? {})} · nested calls ${run.nestedToolCalls ?? 0}`,
        `completion ${run.stopReason ?? "unknown"} · trigger ${run.trigger ?? "unknown"} · model cost ${run.costUsd === undefined ? "n/a" : `$${run.costUsd.toFixed(4)} (reported usage, not invoice)`}`,
      ]),
      `efficiency inspect ${run.inspectTurns ?? 0} · mutation+validation ${run.mutationValidationTurns ?? 0}/${run.mutationTurns ?? 0} · unchanged validation reruns ${run.unchangedValidationReruns ?? 0}`,
    ];
    const evidence = directPolicy
      ? [`evidence indexed receipts ${run.contextIndexedToolResults ?? 0} · failures root ${run.rootToolErrors ?? run.toolErrors} · categories ${topCounter(run.errorCategories ?? {})}`]
      : [
          `durations legacy nested ${formatDuration(run.nestedToolDurationMs)} · errors nested ${run.nestedToolErrors ?? 0}`,
          `evidence externalized legacy-mixed ${run.externalizedToolResults ?? 0}/${run.largeToolResults ?? 0}, context ${run.contextExternalizedToolResults ?? 0}/${run.contextLargeToolResults ?? 0}, nested large ${run.nestedLargeToolResults ?? 0} · failures root ${run.rootToolErrors ?? run.toolErrors}, wrappers ${run.wrapperToolErrors ?? 0}, contained ${run.containedNestedFailures ?? 0} · categories ${topCounter(run.errorCategories ?? {})}`,
        ];
    return [
      ...common,
      ...evidence,
      `context ${run.contextMessages} msg/${run.contextChars} ch · payload ${run.payloadBytes} B`,
      outputSummary(run),
      programSizeSummary(run),
      `tokens in ${run.inputTokens} + cache ${run.cacheReadTokens} (${(cacheShare(run) * 100).toFixed(1)}%) · out ${run.outputTokens}`,
      `direct tools ${topCounter(run.outerTools ?? {})}`,
      `output chars by context tool ${topCounter(run.contextOutputByTool ?? {})}`,
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
    contextOutput: sum.contextOutput + (run.modelContextToolOutputChars ?? 0),
    nestedOutput: sum.nestedOutput + (run.nestedToolOutputChars ?? 0),
    outputTelemetryRuns: sum.outputTelemetryRuns + (run.modelContextToolOutputChars === undefined ? 0 : 1),
  }), { single: 0, parallel: 0, input: 0, cache: 0, output: 0, tools: 0, errors: 0, validation: 0, providerResponse: 0, contextOutput: 0, nestedOutput: 0, outputTelemetryRuns: 0 });
  const cacheTotal = totals.input + totals.cache;
  return [
    `Loop baseline · ${runs.length} runs · recorder ${RUNS_PATH}`,
    `model calls p50 ${percentile(modelCalls, 0.5)}, p90 ${percentile(modelCalls, 0.9)}, mean ${(modelCalls.reduce((a, b) => a + b, 0) / runs.length).toFixed(2)}`,
    `tool calls p50 ${percentile(toolCalls, 0.5)}, p90 ${percentile(toolCalls, 0.9)}, mean ${(toolCalls.reduce((a, b) => a + b, 0) / runs.length).toFixed(2)}`,
    `duration p50 ${formatDuration(percentile(durations, 0.5))}, p90 ${formatDuration(percentile(durations, 0.9))}`,
    `batches single ${totals.single}, parallel ${totals.parallel} · validation rounds ${totals.validation} · tool errors ${totals.errors}/${totals.tools}`,
    `provider headers mean ${formatDuration(totals.providerResponse / runs.length)} · cache read share ${cacheTotal > 0 ? ((totals.cache / cacheTotal) * 100).toFixed(1) : "0.0"}% · output tokens ${totals.output}`,
    `tool output (${totals.outputTelemetryRuns}/${runs.length} v2): context ${totals.contextOutput} ch · nested ${totals.nestedOutput} ch; legacy mixed records remain readable`,
  ].join("\n");
}

type PilotScope = Pick<LoopRun, "projectHash" | "provider" | "model" | "thinking">;
type PilotPhase = "baseline" | "grouped";
type LoopPilot = {
  version: 1; id: string; startedAt: string; active: boolean; targetTasks: number;
  scope: PilotScope; excludedTaskIds: string[];
};
const MAX_PILOT_RUNS = 100;
function samePilotScope(a: PilotScope, b: PilotScope): boolean {
  return a.projectHash === b.projectHash && a.provider === b.provider && a.model === b.model && a.thinking === b.thinking;
}
export function createLoopPilot(scope: PilotScope, excludedTaskIds: string[] = [], startedAt = new Date().toISOString()): LoopPilot {
  return { version: 1, id: `${Date.parse(startedAt).toString(36)}-${randomUUID()}`, startedAt, active: true, targetTasks: 5, scope: { ...scope }, excludedTaskIds: [...excludedTaskIds] };
}
function pilotPath(projectHash: string): string {
  if (!/^[a-f0-9]{12}$/.test(projectHash)) throw new Error("Invalid pilot project hash");
  return join(OBSERVABILITY_DIR, `loop-pilot-${projectHash}.json`);
}
function pilotDirectory(pilot: LoopPilot): string {
  if (!/^[a-z0-9-]+$/.test(pilot.id)) throw new Error("Invalid pilot id");
  return join(OBSERVABILITY_DIR, `loop-pilot-${pilot.scope.projectHash}-${pilot.id}`);
}
function readLoopPilot(projectHash: string): LoopPilot | undefined {
  try {
    const value = JSON.parse(readFileSync(pilotPath(projectHash), "utf8")) as LoopPilot;
    if (value.version !== 1 || value.scope?.projectHash !== projectHash || !Array.isArray(value.excludedTaskIds) || value.targetTasks !== 5 || !Number.isFinite(Date.parse(value.startedAt))) throw new Error("Invalid pilot state");
    pilotDirectory(value);
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
function writePilotJson(path: string, value: unknown): void {
  ensurePrivateDir(dirname(path));
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value)}\n`, { mode: 0o600 });
  chmodSync(temporary, 0o600);
  renameSync(temporary, path);
}
export function saveLoopPilot(pilot: LoopPilot): void {
  writePilotJson(join(pilotDirectory(pilot), "manifest.json"), pilot);
  writePilotJson(pilotPath(pilot.scope.projectHash), pilot);
}
function pilotSamples(pilot: LoopPilot): LoopRun[] {
  try {
    // Immutable per-run receipts avoid lost updates between concurrent Pi sessions.
    const directory = pilotDirectory(pilot);
    return readdirSync(directory).filter((f) => f.endsWith(".run.json")).sort().slice(0, MAX_PILOT_RUNS).map((f) => {
      const r = JSON.parse(readFileSync(join(directory, f), "utf8")) as LoopRun;
      if (typeof r.runId !== "string" || !Number.isFinite(r.durationMs) || !Number.isFinite(r.modelCalls)) throw new Error("Corrupt pilot receipt");
      return r;
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
function activeTaskId(cwd: string): string | undefined {
  try {
    const section = readFileSync(join(cwd, "TODO.md"), "utf8").split(/^## In progress\s*$/m)[1]?.split(/^## /m)[0];
    const ids = [...(section ?? "").matchAll(/<!-- pi-task:([a-zA-Z0-9_-]+) -->/g)];
    return ids.length === 1 ? ids[0]![1] : undefined;
  } catch { return undefined; }
}
export function analyzeLoopPilot(pilot: LoopPilot, records: LoopRun[]) {
  const runs = [...new Map(records.map((r) => [r.runId, r])).values()]
    .filter((r) => r.pilotId === pilot.id && r.projectHash === pilot.scope.projectHash && r.timestamp >= pilot.startedAt && !r.trackedTaskIds?.some((id) => pilot.excludedTaskIds.includes(id)))
    .sort((a, b) => (a.endedAt ?? a.timestamp).localeCompare(b.endedAt ?? b.timestamp));
  const groups = new Map<string, LoopRun[]>();
  for (const run of runs) {
    if (run.trackedTaskIds?.length !== 1) continue;
    const id = run.trackedTaskIds[0]!;
    groups.set(id, [...(groups.get(id) ?? []), run]);
  }
  const tasks = [...groups].map(([id, rs]) => {
    const end = rs.findIndex((r) => r.completedTaskIds?.includes(id));
    const included = end < 0 ? rs : rs.slice(0, end + 1);
    let dirty = false, observedCheck = false;
    for (const r of included) {
      if ((r.codeWriteAttempts ?? r.codeMutationCount ?? 0) > 0) dirty = true;
      if (r.checksCoverFinalWrites) { dirty = false; observedCheck = true; }
      if (r.lastCheckResult === "failed") dirty = true;
    }
    return {
      id, completed: end >= 0, blocked: included.some((r) => r.blockedTaskIds?.includes(id)),
      code: included.some((r) => (r.codeWriteAttempts ?? r.codeMutationCount ?? 0) > 0),
      phase: included[0]!.pilotPhase,
      comparable: included.every((r) => samePilotScope(r, pilot.scope) && r.pilotPhase === included[0]!.pilotPhase && r.measurementVersion === 1),
      checked: observedCheck && !dirty && included.every((r) => !r.timingIncomplete) && included.at(-1)!.stopReason === "stop",
      runs: included.length, modelCalls: included.reduce((n, r) => n + r.modelCalls, 0), durationMs: included.reduce((n, r) => n + r.durationMs, 0),
      checks: new Set(included.flatMap((r) => r.checkSignatures ?? [])).size,
      finishedAt: included.at(-1)!.endedAt ?? included.at(-1)!.timestamp,
    };
  }).sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  const selected = (phase: PilotPhase) => tasks.filter((t) => t.code && t.completed && t.comparable && t.phase === phase).slice(0, pilot.targetTasks);
  const before = selected("baseline"), after = selected("grouped");
  const median = (ts: typeof before, key: "modelCalls" | "durationMs" | "checks") => percentile(ts.map((t) => t[key]), 0.5);
  const change = (key: "modelCalls" | "durationMs") => {
    const base = median(before, key);
    return base > 0 && after.length ? round((median(after, key) / base - 1) * 100) : undefined;
  };
  const modelChange = change("modelCalls"), timeChange = change("durationMs");
  let signal = "insufficient data";
  if (before.length === pilot.targetTasks && after.length === pilot.targetTasks && modelChange !== undefined && timeChange !== undefined) {
    signal = Math.abs(modelChange) < 10 && Math.abs(timeChange) < 10 ? "no visible change"
      : modelChange <= -10 && timeChange <= -10 ? "lower calls and time"
      : modelChange >= 10 && timeChange >= 10 ? "higher calls and time" : "mixed change";
  }
  const incomplete = runs.filter((r) => r.timingIncomplete || r.measurementVersion !== 1).length;
  const untracked = runs.filter((r) => (r.codeWriteAttempts ?? r.codeMutationCount ?? 0) > 0 && r.trackedTaskIds?.length !== 1).length;
  const pending = tasks.filter((t) => t.code && !t.completed).length;
  const excluded = tasks.filter((t) => !t.comparable).length;
  const guidanceMissing = runs.filter((r) => r.pilotPhase === "grouped" && r.pilotGuidanceApplied !== true).length;
  const fewerChecks = before.length > 0 && after.length > 0 && median(after, "checks") < median(before, "checks");
  const guardrails = before.length === 5 && after.length === 5 && incomplete === 0 && untracked === 0 && pending === 0 && excluded === 0 && guidanceMissing === 0 && !fewerChecks && [...before, ...after].every((t) => t.checked);
  return {
    runs, tasks, before, after, signal, modelChange, timeChange, incomplete, untracked, pending, excluded, guidanceMissing, fewerChecks,
    completed: before.length + after.length,
    phase: (before.length < pilot.targetTasks ? "baseline" : "grouped") as PilotPhase,
    guardrails,
    modelBefore: median(before, "modelCalls"), modelAfter: median(after, "modelCalls"),
    timeBefore: median(before, "durationMs"), timeAfter: median(after, "durationMs"),
    checksBefore: median(before, "checks"), checksAfter: median(after, "checks"),
  };
}
function capturePilotRun(run: LoopRun): void {
  const pilot = readLoopPilot(run.projectHash);
  if (!pilot?.active || run.pilotId !== pilot.id || run.timestamp < pilot.startedAt) return;
  const samples = pilotSamples(pilot);
  if (samples.length >= MAX_PILOT_RUNS || analyzeLoopPilot(pilot, samples).completed >= pilot.targetTasks * 2) return;
  if (!/^[a-zA-Z0-9_-]+$/.test(run.runId)) throw new Error("Invalid pilot run id");
  writePilotJson(join(pilotDirectory(pilot), `${run.runId}.run.json`), run);
}
export function formatLoopPilot(pilot: LoopPilot, samples: LoopRun[], observed: LoopRun[] = []): string {
  const s = analyzeLoopPilot(pilot, samples);
  const ids = new Set(samples.map((r) => r.runId));
  const finished = s.completed === pilot.targetTasks * 2 || !pilot.active || samples.length >= MAX_PILOT_RUNS;
  const lastEnd = samples.reduce((at, r) => at > (r.endedAt ?? r.timestamp) ? at : r.endedAt ?? r.timestamp, pilot.startedAt);
  const missing = observed.filter((r) => r.projectHash === pilot.scope.projectHash && r.timestamp >= pilot.startedAt && (!finished || (r.endedAt ?? r.timestamp) <= lastEnd) && !r.trackedTaskIds?.some((id) => pilot.excludedTaskIds.includes(id)) && !ids.has(r.runId)).length;
  const delta = (n: number | undefined) => n === undefined ? "n/a" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
  const phaseTotals = (phase: PilotPhase) => {
    const rs = s.runs.filter((r) => r.pilotPhase === phase);
    return `tool errors ${rs.reduce((n, r) => n + r.toolErrors, 0)}/${rs.reduce((n, r) => n + r.toolCalls, 0)} · passed checker commands ${rs.reduce((n, r) => n + (r.checkPasses ?? 0), 0)} · failed check batches ${rs.reduce((n, r) => n + (r.checkFailures ?? 0), 0)}`;
  };
  return [
    `Loop grouping pilot · baseline ${s.before.length}/5 tasks · grouped ${s.after.length}/5 tasks · ${s.completed === 10 ? "complete" : pilot.active ? s.phase : "stopped"}${samples.length >= MAX_PILOT_RUNS ? " · sample limit reached" : ""}`,
    `scope ${pilot.scope.provider}/${pilot.scope.model}/${pilot.scope.thinking}; tracked code tasks only, all their runs included`,
    `per-task model calls median ${s.modelBefore} → ${s.modelAfter} (${delta(s.modelChange)}) · summed run time ${formatDuration(s.timeBefore)} → ${formatDuration(s.timeAfter)} (${delta(s.timeChange)})`,
    `distinct observed check signatures/task ${s.checksBefore} → ${s.checksAfter} · fewer checks ${s.fewerChecks}`,
    `baseline: ${phaseTotals("baseline")}`,
    `grouped: ${phaseTotals("grouped")}`,
    `performance signal: ${s.signal} (descriptive ±10% band, not statistical significance)`,
    `guardrails: ${s.guardrails && missing === 0 ? "observed checks retained; correctness not proven" : "insufficient verification/comparability"} · incomplete ${s.incomplete} · untracked ${s.untracked} · pending ${s.pending} · excluded ${s.excluded} · guidance missing ${s.guidanceMissing} · missing receipts ${missing}`,
    ...s.tasks.map((t) => `task ${t.id} · ${t.phase} · ${t.completed ? "completed" : t.blocked ? "blocked" : "pending"} · ${t.runs} runs · ${t.modelCalls} calls · ${formatDuration(t.durationMs)} · code ${t.code} · checked ${t.checked}`),
    "Tasks differ: no causal or answer-quality claim. Time is sum of recorded agent runs, not human waiting time. Code/config edit/write only; bash/external changes and test completeness remain unknown.",
    "Baseline's first 5 completed tasks freeze at their first completion; later continuations do not rewrite them. No artificial task splitting. Collection ends at 5+5 tasks or 100 runs; instructions are not globally rewritten at phase changes.",
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
  let pendingInputNs: bigint | undefined;
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
    try {
      mkdirSync(dirname(rawOutput), { recursive: true });
      appendFileSync(rawOutput, `${rawRecords.map((record) => JSON.stringify(record)).join("\n")}\n`, { mode: 0o600 });
      chmodSync(rawOutput, 0o600);
    } catch (error) {
      console.error("[loop-profiler] Could not save event trace:", error instanceof Error ? error.message : String(error));
    }
    rawRecords = [];
  };
  const finalize = () => {
    if (!current) return;
    accountTiming(current);
    if (current.modelActive || current.toolStartedNs.size) current.timingIncomplete = true;
    const {
      startedNs,
      lastTimingNs: _lastTimingNs,
      modelActive: _modelActive,
      toolStartedNs: _toolStartedNs,
      turnTools: _turnTools,
      outerTurnTools: _outerTurnTools,
      previousTool: _previousTool,
      requestStartedNs: _requestStartedNs,
      turnHasValidation: _turnHasValidation,
      turnHasSearch: _turnHasSearch,
      turnHasRead: _turnHasRead,
      turnHasMutation: _turnHasMutation,
      mutationGeneration: _mutationGeneration,
      writeEpoch: _writeEpoch,
      validationGenerations: _validationGenerations,
      ...run
    } = current;
    run.durationMs = round(elapsedMs(startedNs));
    run.endedAt = new Date().toISOString();
    run.toolDurationMs = round(run.toolDurationMs);
    run.outerToolDurationMs = round(run.outerToolDurationMs ?? 0);
    run.providerResponseMs = round(run.providerResponseMs);
    for (const key of ["modelPhaseMs", "activeToolMs", "otherMs", "phaseOverlapMs"] as const) {
      run[key] = round(run[key] ?? 0);
    }
    for (const counter of [run.toolMsByName, run.failedToolMsByName]) {
      for (const key of Object.keys(counter ?? {})) counter![key] = round(counter![key]!);
    }
    current = undefined;
    if (recordRuns) {
      try { appendRun(run); }
      catch (error) {
        console.error("[loop-profiler] Could not save aggregate metrics:", error instanceof Error ? error.message : String(error));
      }
      try { capturePilotRun(run); }
      catch (error) { console.error("[loop-profiler] Could not save pilot receipt:", error instanceof Error ? error.message : String(error)); }
    }
  };

  rawMark("profiler_loaded", { pid: process.pid, output: rawOutput, runs: RUNS_PATH, recordRuns });

  pi.registerCommand("loop-report", {
    description: "Show metrics: /loop-report last|baseline|batching|pilot|pilot-start|pilot-stop",
    handler: async (args, ctx) => {
      const requested = args.trim().toLowerCase();
      const projectHash = createHash("sha256").update(ctx.cwd).digest("hex").slice(0, 12);
      if (requested.startsWith("pilot")) {
        try {
          if (!["pilot", "pilot-start", "pilot-stop"].includes(requested)) throw new Error("Usage: /loop-report pilot|pilot-start|pilot-stop");
          let pilot = readLoopPilot(projectHash);
          if (requested === "pilot-start") {
            if (!recordRuns) throw new Error("Recorder disabled: enable PI_LOOP_RECORD first");
            if (pilot?.active && analyzeLoopPilot(pilot, pilotSamples(pilot)).completed < pilot.targetTasks * 2) throw new Error("Pilot already active; use pilot-stop before restarting");
            const task = activeTaskId(ctx.cwd);
            pilot = createLoopPilot({ projectHash, provider: ctx.model?.provider, model: ctx.model?.id, thinking: ctx.thinkingLevel }, task ? [task] : []);
            saveLoopPilot(pilot);
          }
          if (!pilot) throw new Error("No pilot. Use /loop-report pilot-start");
          if (requested === "pilot-stop") {
            pilot.active = false;
            writePilotJson(pilotPath(projectHash), pilot);
          }
          ctx.ui.notify(formatLoopPilot(pilot, pilotSamples(pilot), readRuns(projectHash)), "info");
        } catch (error) { ctx.ui.notify(error instanceof Error ? error.message : String(error), "warning"); }
        return;
      }
      if (requested && requested !== "last" && requested !== "baseline" && requested !== "batching") {
        ctx.ui.notify("Usage: /loop-report last|baseline|batching", "warning");
        return;
      }
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
  pi.on("input", (event) => {
    if (!current && event.source !== "extension" && !event.streamingBehavior) pendingInputNs = process.hrtime.bigint();
    rawMark("input", { source: event.source, chars: event.text.length });
  });
  const startRun = (event: BeforeAgentStartEvent | undefined, ctx: ExtensionContext) => {
    // Retries and extension continuations belong to the same operation until agent_settled.
    if (current) {
      rawMark("before_agent_start_continuation", { message_type: event?.messageType });
      return;
    }
    runSequence += 1;
    rawTurn = -1;
    rawRequest = 0;
    rawFirstDelta = false;
    const startedNs = process.hrtime.bigint();
    const inputToStartMs = event?.messageType === "user" && pendingInputNs !== undefined ? Number(startedNs - pendingInputNs) / 1e6 : undefined;
    pendingInputNs = undefined;
    const promptChars = event && event.messageType !== "custom" ? event.prompt.length : 0;
    const project = basename(ctx.cwd) || "project";
    const taskId = activeTaskId(ctx.cwd);
    const projectHash = createHash("sha256").update(ctx.cwd).digest("hex").slice(0, 12);
    let pilot: LoopPilot | undefined, pilotPhase: PilotPhase | undefined;
    if (recordRuns) {
      try {
        const candidate = readLoopPilot(projectHash);
        if (candidate?.active) {
          const samples = pilotSamples(candidate), summary = analyzeLoopPilot(candidate, samples);
          if (summary.completed < candidate.targetTasks * 2 && samples.length < MAX_PILOT_RUNS) {
            pilot = candidate;
            pilotPhase = (taskId ? samples.find((r) => r.trackedTaskIds?.includes(taskId))?.pilotPhase : undefined) ?? summary.phase;
          }
        }
      } catch (error) { console.error("[loop-profiler] Could not load pilot:", error instanceof Error ? error.message : String(error)); }
    }
    current = {
      version: VERSION,
      timestamp: new Date().toISOString(),
      runId: `${Date.now().toString(36)}-${process.pid}-${runSequence}`,
      project,
      projectHash,
      sessionHash: createHash("sha256").update(String(ctx.sessionManager?.getSessionId?.() || ctx.sessionManager?.getSessionFile?.() || "ephemeral")).digest("hex").slice(0, 16),
      provider: ctx.model?.provider,
      model: ctx.model?.id,
      thinking: ctx.thinkingLevel,
      durationMs: 0,
      measurementVersion: 1,
      pilotId: pilot?.id,
      pilotPhase,
      pilotGuidanceApplied: false,
      checkSignatures: [],
      codeMutationCount: 0,
      codeWriteAttempts: 0,
      checkPasses: 0,
      checkFailures: 0,
      checksCoverFinalWrites: false,
      trackedTaskIds: taskId ? [taskId] : [],
      completedTaskIds: [],
      blockedTaskIds: [],
      promptChars,
      inputToStartMs: inputToStartMs === undefined ? undefined : round(inputToStartMs),
      trigger: event?.messageType ?? "unknown",
      modelPhaseMs: 0,
      activeToolMs: 0,
      otherMs: 0,
      phaseOverlapMs: 0,
      timingIncomplete: false,
      toolMsByName: {},
      failedToolMsByName: {},
      systemPromptChars: event?.systemPrompt.length ?? 0,
      selectedTools: event?.systemPromptOptions.selectedTools?.length ?? 0,
      contextFiles: event?.systemPromptOptions.contextFiles?.length ?? 0,
      skills: event?.systemPromptOptions.skills?.length ?? 0,
      contextMessages: 0,
      contextChars: 0,
      modelCalls: 0,
      turns: 0,
      toolCalls: 0,
      singleToolBatches: 0,
      parallelToolBatches: 0,
      toolErrors: 0,
      toolOutputChars: 0,
      modelContextToolOutputChars: 0,
      directContextOutputChars: 0,
      modelContextToolOutputImages: 0,
      contextOutputByTool: {},
      toolDurationMs: 0,
      batchingPolicy: BATCHING_POLICY,
      directToolCalls: 0,
      outerToolCalls: 0,
      outerSingleToolBatches: 0,
      outerParallelToolBatches: 0,
      outerToolErrors: 0,
      outerToolDurationMs: 0,
      outerTools: {},
      contextLargeToolResults: 0,
      contextExternalizedToolResults: 0,
      contextIndexedToolResults: 0,
      externalizedOriginalChars: 0,
      externalizedReturnedChars: 0,
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
      validationReruns: 0,
      unchangedValidationReruns: 0,
      rootToolErrors: 0,
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
      lastTimingNs: startedNs,
      modelActive: false,
      toolStartedNs: new Map(),
      turnTools: [],
      outerTurnTools: [],
      turnHasValidation: false,
      turnHasSearch: false,
      turnHasRead: false,
      turnHasMutation: false,
      mutationGeneration: 0,
      writeEpoch: 0,
      validationGenerations: new Map(),
    };
    rawMark("before_agent_start", {
      prompt_chars: promptChars,
      message_type: event?.messageType,
      system_prompt_chars: event?.systemPrompt.length ?? 0,
      selected_tools: event?.systemPromptOptions.selectedTools?.length ?? 0,
      context_files: event?.systemPromptOptions.contextFiles?.length ?? 0,
      skills: event?.systemPromptOptions.skills?.length ?? 0,
      tool_names: event?.systemPromptOptions.selectedTools,
      skill_names: event?.systemPromptOptions.skills?.map((skill) => skill.name),
    });
    if (pilotPhase === "grouped" && pilot && event && samePilotScope(current, pilot.scope)) {
      current.pilotGuidanceApplied = true;
      return { message: {
        customType: "loop-grouping-pilot", display: false,
        content: "Grouping pilot active. Batch known-independent reads and checks using codemode or one shell invocation with bounded output. Keep dependent steps and conflicting writes separate. Do not omit required validation, create artificial tasks or split/merge tasks to improve counters. Use normal TODO task tracking. Correctness takes priority over fewer model turns.",
      } };
    }
  };
  pi.on("before_agent_start", startRun);
  pi.on("agent_start", (_event, ctx) => {
    if (!current) startRun(undefined, ctx);
    rawMark("agent_start");
  });
  pi.on("turn_start", (event) => {
    rawTurn = event.turnIndex;
    if (current) {
      accountTiming(current);
      if (current.modelActive) current.timingIncomplete = true;
      current.modelActive = true;
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
    if (current) {
      accountTiming(current);
      const key = executionKey(event);
      if (current.toolStartedNs.has(key)) {
        current.timingIncomplete = true;
        return;
      }
      const nested = event.parentToolCallId !== undefined;
      const hash = validationHash(event.toolName, event.args);
      const mutation = isMutationTool(event.toolName);
      current.toolCalls += 1;
      current.turnTools.push(event.toolName);
      if (nested) current.nestedToolCalls = (current.nestedToolCalls ?? 0) + 1;
      else {
        current.directToolCalls = (current.directToolCalls ?? 0) + 1;
        current.outerToolCalls = (current.outerToolCalls ?? 0) + 1;
        current.outerTurnTools.push(event.toolName);
        increment(current.outerTools ?? (current.outerTools = {}), event.toolName);
      }
      const codeMutation = isCodeMutation(event.toolName, event.args);
      if (codeMutation) { current.writeEpoch++; current.codeWriteAttempts = (current.codeWriteAttempts ?? 0) + 1; current.checksCoverFinalWrites = false; }
      current.toolStartedNs.set(key, {
        startedNs: process.hrtime.bigint(), validationHash: hash, mutation, nested, codeMutation,
        checks: observedChecks(event.toolName, event.args), writeEpoch: current.writeEpoch,
        racedMutation: [...current.toolStartedNs.values()].some((e) => e.codeMutation),
      });
      increment(current.tools, event.toolName);
      if (current.previousTool) increment(current.transitions, `${current.previousTool}->${event.toolName}`);
      current.previousTool = event.toolName;
      if (hash) current.turnHasValidation = true;
      if (event.toolName === "grep" || event.toolName === "find") current.turnHasSearch = true;
      if (event.toolName === "read") current.turnHasRead = true;
      if (mutation) {
        if (!current.turnHasSearch || !current.turnHasRead) current.mutationBeforeInspect = (current.mutationBeforeInspect ?? 0) + 1;
        current.turnHasMutation = true;
      }
    }
    rawMark("tool_start", { id: event.toolCallId, tool: event.toolName, boundary: event.parentToolCallId === undefined ? "direct" : "nested" });
  });
  pi.on("tool_call", (event) => rawMark("tool_preflight", { id: event.toolCallId, tool: event.toolName }));
  pi.on("tool_execution_end", (event) => {
    if (current) {
      accountTiming(current);
      const key = executionKey(event);
      const execution = current.toolStartedNs.get(key);
      if (!execution) {
        current.timingIncomplete = true;
        return;
      }
      const duration = elapsedMs(execution.startedNs);
      current.toolStartedNs.delete(key);
      increment(current.toolMsByName!, event.toolName, duration);
      current.toolDurationMs += duration;
      const text = contentText(event.result?.content);
      const outputChars = contentChars(event.result?.content);
      const outputImages = contentImages(event.result?.content);
      current.toolOutputChars += text.length;
      if (execution.nested) {
        current.nestedToolDurationMs = (current.nestedToolDurationMs ?? 0) + duration;
        current.nestedToolOutputChars = (current.nestedToolOutputChars ?? 0) + outputChars;
      } else {
        current.outerToolDurationMs = (current.outerToolDurationMs ?? 0) + duration;
        current.modelContextToolOutputChars = (current.modelContextToolOutputChars ?? 0) + outputChars;
        current.directContextOutputChars = (current.directContextOutputChars ?? 0) + outputChars;
        current.modelContextToolOutputImages = (current.modelContextToolOutputImages ?? 0) + outputImages;
        if (outputChars > 0) increment(current.contextOutputByTool ?? (current.contextOutputByTool = {}), event.toolName, outputChars);
        const contextIndexed = text.startsWith("[context-sidecar]") && text.includes("\nSource: ");
        if (contextIndexed) current.contextIndexedToolResults = (current.contextIndexedToolResults ?? 0) + 1;
        else if (outputChars >= 32_768) {
          current.largeToolResults = (current.largeToolResults ?? 0) + 1;
          current.largeInlineToolResults = (current.largeInlineToolResults ?? 0) + 1;
          current.contextLargeToolResults = (current.contextLargeToolResults ?? 0) + 1;
        }
      }
      if (event.isError) {
        current.toolErrors += 1;
        increment(current.failedToolMsByName!, event.toolName, duration);
        if (execution.nested) current.nestedToolErrors = (current.nestedToolErrors ?? 0) + 1;
        else {
          current.outerToolErrors = (current.outerToolErrors ?? 0) + 1;
          current.rootToolErrors = (current.rootToolErrors ?? 0) + 1;
        }
        increment(current.errorCategories ?? (current.errorCategories = {}), classifyError(event.result?.content));
      }
      if (execution.codeMutation && !event.isError) current.codeMutationCount = (current.codeMutationCount ?? 0) + 1;
      if (execution.checks.length) {
        current.lastCheckResult = event.isError ? "failed" : "passed";
        if (event.isError) { current.checkFailures = (current.checkFailures ?? 0) + 1; current.checksCoverFinalWrites = false; }
        else {
          current.checkPasses = (current.checkPasses ?? 0) + execution.checks.length;
          current.checkSignatures = [...new Set([...(current.checkSignatures ?? []), ...execution.checks])].slice(0, 100);
          current.checksCoverFinalWrites = !execution.racedMutation && execution.writeEpoch === current.writeEpoch && ![...current.toolStartedNs.values()].some((e) => e.codeMutation);
        }
      }
      if (event.toolName === "task_queue" && !event.isError) {
        const match = /^(Claimed|Completed|Blocked) #([a-zA-Z0-9_-]+)\b/.exec(text);
        if (match) {
          const id = match[2]!;
          if (!current.trackedTaskIds!.includes(id)) current.trackedTaskIds!.push(id);
          if (match[1] === "Completed" && !current.completedTaskIds!.includes(id)) current.completedTaskIds!.push(id);
          if (match[1] === "Blocked" && !current.blockedTaskIds!.includes(id)) current.blockedTaskIds!.push(id);
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
    }
    rawMark("tool_end", { id: event.toolCallId, tool: event.toolName, boundary: event.parentToolCallId === undefined ? "direct" : "nested", error: event.isError });
  });
  pi.on("message_end", (event) => {
    if (event.message.role !== "assistant") return;
    if (current) {
      accountTiming(current);
      current.modelActive = false;
      current.stopReason = event.message.stopReason;
      const cost = event.message.usage?.cost?.total;
      if (typeof cost === "number" && Number.isFinite(cost) && cost >= 0) current.costUsd = (current.costUsd ?? 0) + cost;
    }
    const message = event.message as typeof event.message & { usage?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number } };
    const usage = message.usage;
    if (current && usage) {
      current.inputTokens += usage.input ?? 0;
      current.outputTokens += usage.output ?? 0;
      current.cacheReadTokens += usage.cacheRead ?? 0;
      current.cacheWriteTokens += usage.cacheWrite ?? 0;
    }
    rawMark("assistant_message_end", {
      stop_reason: event.message.stopReason,
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
      const count = current.outerTurnTools.length;
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
    pendingInputNs = undefined;
    if (current) current.timingIncomplete = true;
    finalize();
    flushRaw();
  });
}
