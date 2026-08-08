import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
  Theme,
} from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const VERSION = 1;
const CONFIG_DIR_NAME = ".pi";
const AGENT_ROOT = resolve(process.env.PI_CODING_AGENT_DIR || join(process.env.HOME || "~", ".pi", "agent"));
const OBSERVABILITY_ROOT = join(AGENT_ROOT, "observability", "decisions");
const LOOP_RUNS_PATH = process.env.PI_LOOP_RUNS_OUT || join(AGENT_ROOT, "observability", "loop-runs.jsonl");
const CONFIG_NAME = "decision-observability.json";
const DEFAULT_MAX_RECORDS = 500;
const DEFAULT_RETENTION_DAYS = 90;
const DEFAULT_MAX_TEXT_CHARS = 500;
const MAX_LEDGER_BYTES = 5 * 1024 * 1024;
const LOCK_WAIT = new Int32Array(new SharedArrayBuffer(4));

type DecisionStatus = "proposed" | "validated" | "failed" | "superseded" | "reverted" | "unknown";
type DecisionKind = "architecture" | "security" | "dependency" | "testing" | "workflow" | "config" | "general";
type StatusFilter = "all" | "open" | "issues";

export type DecisionValidation = {
  timestamp: string;
  summary: string;
  success: boolean | null;
};

export type DecisionRecord = {
  version: 1;
  id: string;
  key?: string;
  kind: DecisionKind;
  decision: string;
  status: DecisionStatus;
  createdAt: string;
  updatedAt: string;
  projectHash: string;
  sessionHash: string;
  runSequence: number;
  validations: DecisionValidation[];
  commit?: string;
};

type DecisionConfig = {
  enabled: boolean;
  mode: "structured-markers";
  maxRecords: number;
  retentionDays: number;
  maxTextChars: number;
  capturePaths: boolean;
  captureCommits: boolean;
  captureToolOutput: false;
  captureMessages: false;
  capturePrompts: false;
};

type LoopRun = {
  timestamp: string;
  runId?: string;
  projectHash?: string;
  sessionHash?: string;
  durationMs?: number;
  modelCalls?: number;
  toolCalls?: number;
  validationRounds?: number;
  toolErrors?: number;
};

type Marker = {
  type: "DECISION" | "VALIDATION" | "SUPERSEDED";
  key?: string;
  payload: string;
};

const DEFAULT_CONFIG: DecisionConfig = {
  enabled: false,
  mode: "structured-markers",
  maxRecords: DEFAULT_MAX_RECORDS,
  retentionDays: DEFAULT_RETENTION_DAYS,
  maxTextChars: DEFAULT_MAX_TEXT_CHARS,
  capturePaths: false,
  captureCommits: true,
  captureToolOutput: false,
  captureMessages: false,
  capturePrompts: false,
};

function clampInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return typeof value === "number" && Number.isInteger(value) ? Math.max(minimum, Math.min(maximum, value)) : fallback;
}

function projectHash(cwd: string): string {
  return createHash("sha256").update(resolve(cwd)).digest("hex").slice(0, 12);
}

function sessionHash(ctx: ExtensionContext | ExtensionCommandContext): string {
  const id = ctx.sessionManager.getSessionId?.() || ctx.sessionManager.getSessionFile?.() || "ephemeral";
  return createHash("sha256").update(String(id)).digest("hex").slice(0, 16);
}

function configPath(cwd: string): string {
  return process.env.PI_DECISION_CONFIG || join(cwd, CONFIG_DIR_NAME, CONFIG_NAME);
}

function ledgerPath(hash: string): string {
  return process.env.PI_DECISION_LEDGER_OUT || join(OBSERVABILITY_ROOT, hash, "ledger.jsonl");
}

function loadConfig(cwd: string, trusted: boolean): DecisionConfig {
  if (!trusted && !process.env.PI_DECISION_CONFIG) return DEFAULT_CONFIG;
  try {
    const raw = JSON.parse(readFileSync(configPath(cwd), "utf8")) as Record<string, unknown>;
    if (raw.enabled !== true || (raw.mode !== undefined && raw.mode !== "structured-markers")) return DEFAULT_CONFIG;
    return {
      enabled: true,
      mode: "structured-markers",
      maxRecords: clampInteger(raw.maxRecords, DEFAULT_MAX_RECORDS, 10, 2_000),
      retentionDays: clampInteger(raw.retentionDays, DEFAULT_RETENTION_DAYS, 1, 365),
      maxTextChars: clampInteger(raw.maxTextChars, DEFAULT_MAX_TEXT_CHARS, 100, 1_000),
      capturePaths: raw.capturePaths === true,
      captureCommits: raw.captureCommits !== false,
      captureToolOutput: false,
      captureMessages: false,
      capturePrompts: false,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
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

function withLedgerLock<T>(path: string, action: () => T): T {
  ensurePrivateDir(dirname(path));
  const lock = `${path}.lock`;
  let descriptor: number | undefined;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      descriptor = openSync(lock, "wx", 0o600);
      writeFileSync(descriptor, `${process.pid}\n`);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      let stale = false;
      try {
        const owner = Number.parseInt(readFileSync(lock, "utf8").trim(), 10);
        if (Number.isInteger(owner) && owner > 0) {
          try { process.kill(owner, 0); } catch (ownerError) { stale = (ownerError as NodeJS.ErrnoException).code === "ESRCH"; }
        }
        if (Date.now() - statSync(lock).mtimeMs > 30_000) stale = true;
      } catch { stale = true; }
      if (stale) {
        try { unlinkSync(lock); } catch {}
        continue;
      }
      Atomics.wait(LOCK_WAIT, 0, 0, 5);
    }
  }
  if (descriptor === undefined) throw new Error("decision ledger lock timeout");
  try {
    return action();
  } finally {
    closeSync(descriptor);
    try { unlinkSync(lock); } catch {}
  }
}

function parseLedger(path: string): DecisionRecord[] {
  try {
    return readFileSync(path, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try { return JSON.parse(line) as DecisionRecord; } catch { return undefined; }
      })
      .filter((record): record is DecisionRecord => Boolean(record && record.version === VERSION));
  } catch {
    return [];
  }
}

function retained(records: DecisionRecord[], config: DecisionConfig): DecisionRecord[] {
  const cutoff = Date.now() - config.retentionDays * 86_400_000;
  let result = records
    .filter((record) => Date.parse(record.updatedAt) >= cutoff)
    .slice(-config.maxRecords);
  while (Buffer.byteLength(`${result.map((record) => JSON.stringify(record)).join("\n")}\n`) > MAX_LEDGER_BYTES && result.length > 1) {
    result = result.slice(1);
  }
  return result;
}

function updateLedger(path: string, config: DecisionConfig, update: (records: DecisionRecord[]) => void): DecisionRecord[] {
  return withLedgerLock(path, () => {
    const records = parseLedger(path);
    update(records);
    const result = retained(records, config);
    atomicWrite(path, result.length ? `${result.map((record) => JSON.stringify(record)).join("\n")}\n` : "");
    return result;
  });
}

function assistantText(message: unknown): string {
  if (!message || typeof message !== "object") return "";
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((block): block is { type?: string; text: string } => Boolean(block && typeof block === "object" && (block as { type?: string }).type === "text" && typeof (block as { text?: unknown }).text === "string"))
    .map((block) => block.text)
    .join("\n");
}

function redactSecrets(value: string): string {
  return value
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "<redacted-private-key>")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "<redacted-secret>")
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]{8,}/gi, "Bearer <redacted-secret>")
    .replace(/\b(api[_ -]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=<redacted-secret>");
}

function redactPaths(value: string): string {
  return value
    .replace(/(^|\s)\/(?:[^/\s]+\/)+[^\s,;]*/g, "$1<path>")
    .replace(/\b[A-Za-z]:\\(?:[^\\\s]+\\)+[^\s,;]*/g, "<path>");
}

function sanitizePayload(value: string, config: DecisionConfig): string | undefined {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > config.maxTextChars) return undefined;
  const secretSafe = redactSecrets(normalized);
  return config.capturePaths ? secretSafe : redactPaths(secretSafe);
}

export function parseDecisionMarkers(text: string, config: Pick<DecisionConfig, "maxTextChars" | "capturePaths"> = DEFAULT_CONFIG): Marker[] {
  const effective = { ...DEFAULT_CONFIG, ...config };
  const markers: Marker[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\[(DECISION|VALIDATION|SUPERSEDED)\]\s*(?:([a-z0-9][a-z0-9._-]{0,63}):\s*)?(.+)$/i);
    if (!match) continue;
    const payload = sanitizePayload(match[3]!, effective);
    if (!payload) continue;
    markers.push({ type: match[1]!.toUpperCase() as Marker["type"], key: match[2]?.toLowerCase(), payload });
  }
  return markers;
}

function classifyKind(key: string | undefined, text: string): DecisionKind {
  const value = `${key ?? ""} ${text}`.toLowerCase();
  if (/security|trust|secret|permission|sandbox|безопас|доступ/.test(value)) return "security";
  if (/package|dependency|version|pin|npm|пакет|зависим/.test(value)) return "dependency";
  if (/test|validation|verify|rpc|провер|тест/.test(value)) return "testing";
  if (/config|setting|mode|конфиг|режим/.test(value)) return "config";
  if (/architecture|runtime|engine|storage|schema|архитект|хранилищ/.test(value)) return "architecture";
  if (/workflow|process|rollback|release|migration|процесс|откат|миграц/.test(value)) return "workflow";
  return "general";
}

function validationOutcome(summary: string): boolean | null {
  if (/\b(?:FAIL|FAILED|ERROR)\b|\bошиб|не\s+пройд|(?:exit(?:code)?|errors?)\s*[:=]\s*[1-9]\d*/iu.test(summary)) return false;
  if (/\bPASS\b|\bуспеш|\bпройд|(?:exit(?:code)?|errors?)\s*[:=]\s*0\b/iu.test(summary)) return true;
  return null;
}

function recordId(timestamp: string, session: string, key: string | undefined, decision: string): string {
  const compact = timestamp.replace(/[-:TZ.]/g, "").slice(0, 14);
  const suffix = createHash("sha256").update(`${session}\0${key ?? ""}\0${decision}\0${timestamp}`).digest("hex").slice(0, 6);
  return `D-${compact}-${suffix}`;
}

function latestTarget(records: DecisionRecord[], marker: Marker, session: string, runSequence: number, createdIds: string[]): DecisionRecord | undefined {
  const reversed = [...records].reverse();
  if (marker.key) return reversed.find((record) => record.key === marker.key);
  if (createdIds.length) return reversed.find((record) => createdIds.includes(record.id));
  return reversed.find((record) => record.sessionHash === session && record.runSequence === runSequence && record.status === "proposed");
}

export function applyDecisionMarkers(
  records: DecisionRecord[],
  markers: Marker[],
  context: { projectHash: string; sessionHash: string; runSequence: number; timestamp: string; captureCommits: boolean },
): void {
  const createdIds: string[] = [];
  for (const marker of markers) {
    if (marker.type === "DECISION") {
      const duplicate = [...records].reverse().find((record) =>
        record.sessionHash === context.sessionHash && record.key === marker.key && record.decision === marker.payload && record.status === "proposed",
      );
      if (duplicate) {
        duplicate.updatedAt = context.timestamp;
        createdIds.push(duplicate.id);
        continue;
      }
      const record: DecisionRecord = {
        version: VERSION,
        id: recordId(context.timestamp, context.sessionHash, marker.key, marker.payload),
        key: marker.key,
        kind: classifyKind(marker.key, marker.payload),
        decision: marker.payload,
        status: "proposed",
        createdAt: context.timestamp,
        updatedAt: context.timestamp,
        projectHash: context.projectHash,
        sessionHash: context.sessionHash,
        runSequence: context.runSequence,
        validations: [],
      };
      records.push(record);
      createdIds.push(record.id);
      continue;
    }
    if (marker.type === "SUPERSEDED") {
      const target = marker.key
        ? [...records].reverse().find((record) => record.key === marker.key)
        : [...records].reverse().find((record) => record.decision === marker.payload);
      if (target) {
        target.status = "superseded";
        target.updatedAt = context.timestamp;
      }
      continue;
    }
    const target = latestTarget(records, marker, context.sessionHash, context.runSequence, createdIds);
    if (!target) continue;
    const success = validationOutcome(marker.payload);
    target.validations.push({ timestamp: context.timestamp, summary: marker.payload, success });
    target.validations = target.validations.slice(-20);
    if (success === false) target.status = "failed";
    else if (success === true && /\b(?:rollback|revert|откат)\b/iu.test(marker.payload)) target.status = "reverted";
    else if (success === true) target.status = "validated";
    else if (target.status === "proposed") target.status = "unknown";
    if (context.captureCommits) {
      const commit = marker.payload.match(/(?:^|\s)([0-9a-f]{7,40})(?=$|[\s,.;])/i)?.[1];
      if (commit) target.commit = commit;
    }
    target.updatedAt = context.timestamp;
  }
}

function readLoopRuns(project: string): LoopRun[] {
  try {
    return readFileSync(LOOP_RUNS_PATH, "utf8")
      .split("\n")
      .filter(Boolean)
      .slice(-500)
      .map((line) => {
        try { return JSON.parse(line) as LoopRun; } catch { return undefined; }
      })
      .filter((run): run is LoopRun => Boolean(run && run.projectHash === project));
  } catch {
    return [];
  }
}

function matchingRun(record: DecisionRecord, runs: LoopRun[]): LoopRun | undefined {
  const created = Date.parse(record.createdAt);
  return runs
    .filter((run) => (!run.sessionHash || run.sessionHash === record.sessionHash) && Date.parse(run.timestamp) <= created + 1_000)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .find((run) => created - Date.parse(run.timestamp) <= 6 * 60 * 60 * 1_000);
}

function statusGlyph(status: DecisionStatus): string {
  if (status === "validated") return "✓";
  if (status === "failed") return "✗";
  if (status === "superseded") return "↻";
  if (status === "reverted") return "↩";
  return "?";
}

function age(timestamp: string): string {
  const milliseconds = Math.max(0, Date.now() - Date.parse(timestamp));
  const hours = Math.floor(milliseconds / 3_600_000);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function selectRecords(records: DecisionRecord[], mode: string): DecisionRecord[] {
  const normalized = mode.toLowerCase();
  const days = normalized === "7d" ? 7 : normalized === "30d" ? 30 : undefined;
  let selected = days ? records.filter((record) => Date.parse(record.createdAt) >= Date.now() - days * 86_400_000) : [...records];
  if (normalized === "open") selected = selected.filter((record) => record.status === "proposed" || record.status === "unknown");
  if (normalized === "failures") selected = selected.filter((record) => record.status === "failed" || record.status === "reverted" || record.status === "superseded");
  return selected.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function detailLines(record: DecisionRecord, runs: LoopRun[]): string[] {
  const run = matchingRun(record, runs);
  const lines = [
    `${statusGlyph(record.status)} ${record.status} · ${record.kind}`,
    `ID ${record.id}${record.key ? ` · key ${record.key}` : ""}`,
    `Created ${record.createdAt}${record.commit ? ` · commit ${record.commit}` : ""}`,
    "",
    record.decision,
  ];
  if (record.validations.length) {
    lines.push("", "Evidence:");
    for (const item of record.validations.slice(-5)) lines.push(`${item.success === true ? "✓" : item.success === false ? "✗" : "?"} ${item.summary}`);
  }
  if (run) {
    lines.push("", `Run: model ${run.modelCalls ?? 0} · tools ${run.toolCalls ?? 0} · validation ${run.validationRounds ?? 0} · errors ${run.toolErrors ?? 0} · ${Math.round(run.durationMs ?? 0)}ms`);
  }
  return lines;
}

export function formatDecisionReport(records: DecisionRecord[], mode = "30d", runs: LoopRun[] = []): string {
  const selected = selectRecords(records, mode === "last" ? "all" : mode);
  if (selected.length === 0) return `Decision report · ${mode}\nNo matching decisions.`;
  if (mode === "last") return [`Decision ${selected[0]!.id}`, ...detailLines(selected[0]!, runs)].join("\n");
  const counts = (status: DecisionStatus) => selected.filter((record) => record.status === status).length;
  const covered = selected.filter((record) => record.status === "validated" || record.status === "failed" || record.status === "reverted").length;
  const lines = [
    `Decision report · ${mode} · ${selected.length} decisions`,
    `✓ ${counts("validated")} validated · ✗ ${counts("failed")} failed · ↻ ${counts("superseded")} superseded · ↩ ${counts("reverted")} reverted · ? ${counts("proposed") + counts("unknown")} open`,
    `validation coverage ${((covered / selected.length) * 100).toFixed(0)}%`,
    "",
  ];
  for (const record of selected.slice(0, 12)) lines.push(`${statusGlyph(record.status)} ${record.key ?? record.id} · ${record.decision} · ${age(record.updatedAt)}`);
  if (selected.length > 12) lines.push(`… ${selected.length - 12} more; use /decisions or a narrower filter`);
  return lines.join("\n");
}

function padAnsi(value: string, width: number): string {
  const clipped = truncateToWidth(value, width, "");
  return clipped + " ".repeat(Math.max(0, width - visibleWidth(clipped)));
}

function wrapPlain(value: string, width: number): string[] {
  if (width <= 1) return [truncateToWidth(value, Math.max(1, width), "")];
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) current = word;
    else if (visibleWidth(`${current} ${word}`) <= width) current += ` ${word}`;
    else { lines.push(truncateToWidth(current, width, "")); current = word; }
  }
  if (current) lines.push(truncateToWidth(current, width, ""));
  return lines.length ? lines : [""];
}

export class DecisionDashboard {
  private selected = 0;
  private filter: StatusFilter = "all";
  private days = 30;
  private search = "";
  private searchMode = false;
  private detail = false;
  private message = "";
  private records: DecisionRecord[];
  private readonly runs: LoopRun[];
  private readonly theme: Theme;
  private readonly requestRender: () => void;
  private readonly done: () => void;
  private readonly reload: () => DecisionRecord[];
  private readonly exportReport: () => string;

  constructor(
    records: DecisionRecord[],
    runs: LoopRun[],
    theme: Theme,
    requestRender: () => void,
    done: () => void,
    reload: () => DecisionRecord[],
    exportReport: () => string,
  ) {
    this.records = records;
    this.runs = runs;
    this.theme = theme;
    this.requestRender = requestRender;
    this.done = done;
    this.reload = reload;
    this.exportReport = exportReport;
  }

  private visible(): DecisionRecord[] {
    const cutoff = this.days > 0 ? Date.now() - this.days * 86_400_000 : 0;
    const query = this.search.toLowerCase();
    return this.records
      .filter((record) => Date.parse(record.createdAt) >= cutoff)
      .filter((record) => this.filter === "all" || (this.filter === "open" ? record.status === "proposed" || record.status === "unknown" : ["failed", "reverted", "superseded"].includes(record.status)))
      .filter((record) => !query || `${record.key ?? ""} ${record.id} ${record.kind} ${record.status} ${record.decision}`.toLowerCase().includes(query))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  handleInput(data: string): void {
    if (this.searchMode) {
      if (matchesKey(data, Key.escape)) { this.searchMode = false; this.search = ""; }
      else if (matchesKey(data, Key.enter)) this.searchMode = false;
      else if (matchesKey(data, Key.backspace)) this.search = this.search.slice(0, -1);
      else if (!data.startsWith("\x1b") && !/[\x00-\x1f]/.test(data)) this.search += data;
      this.selected = 0;
      this.requestRender();
      return;
    }
    const items = this.visible();
    if (matchesKey(data, Key.escape)) {
      if (this.detail) this.detail = false;
      else this.done();
    } else if (matchesKey(data, Key.up)) this.selected = Math.max(0, this.selected - 1);
    else if (matchesKey(data, Key.down)) this.selected = Math.min(Math.max(0, items.length - 1), this.selected + 1);
    else if (matchesKey(data, Key.pageUp)) this.selected = Math.max(0, this.selected - 8);
    else if (matchesKey(data, Key.pageDown)) this.selected = Math.min(Math.max(0, items.length - 1), this.selected + 8);
    else if (matchesKey(data, Key.enter)) this.detail = !this.detail;
    else if (data === "/") this.searchMode = true;
    else if (data === "a") { this.filter = "all"; this.selected = 0; }
    else if (data === "o") { this.filter = "open"; this.selected = 0; }
    else if (data === "x") { this.filter = "issues"; this.selected = 0; }
    else if (data === "1") { this.days = 1; this.selected = 0; }
    else if (data === "7") { this.days = 7; this.selected = 0; }
    else if (data === "0") { this.days = 30; this.selected = 0; }
    else if (data === "*") { this.days = 0; this.selected = 0; }
    else if (data === "r") { this.records = this.reload(); this.message = "reloaded"; }
    else if (data === "e") this.message = this.exportReport();
    this.requestRender();
  }

  render(width: number): string[] {
    const safeWidth = Math.max(20, width);
    const items = this.visible();
    this.selected = Math.min(this.selected, Math.max(0, items.length - 1));
    const current = items[this.selected];
    const counts = {
      valid: items.filter((record) => record.status === "validated").length,
      failed: items.filter((record) => record.status === "failed").length,
      open: items.filter((record) => record.status === "proposed" || record.status === "unknown").length,
    };
    const period = this.days ? `${this.days}d` : "all";
    const lines = [
      truncateToWidth(this.theme.fg("accent", this.theme.bold(`Decision Observatory · ${period} · ${this.filter}`)), safeWidth),
      truncateToWidth(this.theme.fg("dim", `✓${counts.valid} ✗${counts.failed} ?${counts.open}${this.search ? ` · search: ${this.search}` : ""}${this.searchMode ? "_" : ""}`), safeWidth),
      truncateToWidth(this.theme.fg("borderMuted", "─".repeat(safeWidth)), safeWidth, ""),
    ];
    if (!items.length) lines.push(this.theme.fg("muted", "No matching decisions."));
    const start = Math.max(0, Math.min(this.selected - 5, Math.max(0, items.length - 11)));
    const shown = items.slice(start, start + 11);
    const wide = safeWidth >= 100 && current;
    const leftWidth = wide ? Math.min(58, Math.floor(safeWidth * 0.54)) : safeWidth;
    const rightWidth = safeWidth - leftWidth - (wide ? 3 : 0);
    const details = current ? detailLines(current, this.runs).flatMap((line) => wrapPlain(line, Math.max(10, rightWidth))).slice(0, 15) : [];
    const rowCount = Math.max(shown.length, wide ? details.length : 0);
    for (let index = 0; index < rowCount; index += 1) {
      const record = shown[index];
      let left = "";
      if (record) {
        const absolute = start + index;
        const prefix = absolute === this.selected ? ">" : " ";
        const raw = `${prefix} ${statusGlyph(record.status)} ${record.key ?? record.id} · ${record.decision} · ${age(record.updatedAt)}`;
        left = absolute === this.selected ? this.theme.bg("selectedBg", padAnsi(raw, leftWidth)) : padAnsi(this.theme.fg("text", raw), leftWidth);
      } else left = " ".repeat(leftWidth);
      if (wide) {
        const right = details[index] ? this.theme.fg(index === 0 ? "accent" : "muted", details[index]!) : "";
        lines.push(truncateToWidth(`${left} │ ${right}`, safeWidth, ""));
      } else lines.push(truncateToWidth(left, safeWidth, ""));
    }
    if (!wide && this.detail && current) {
      lines.push(truncateToWidth(this.theme.fg("borderMuted", "─".repeat(safeWidth)), safeWidth, ""));
      for (const line of detailLines(current, this.runs).flatMap((item) => wrapPlain(item, safeWidth)).slice(0, 10)) lines.push(this.theme.fg("muted", line));
    }
    lines.push(truncateToWidth(this.theme.fg("dim", "↑↓ select · Enter detail · a/o/x status · 1/7/0/* period · / search · r refresh · e export · Esc close"), safeWidth));
    if (this.message) lines.push(truncateToWidth(this.theme.fg("success", this.message), safeWidth));
    return lines.map((line) => truncateToWidth(line, safeWidth, ""));
  }

  invalidate(): void {}
}

function parseReportArgs(args: string): { mode: string; markdown: boolean } | undefined {
  const parts = args.trim().split(/\s+/).filter(Boolean);
  const markdown = parts.includes("--markdown");
  const modes = parts.filter((part) => part !== "--markdown");
  const mode = modes[0] || "30d";
  if (modes.length > 1 || !["last", "7d", "30d", "open", "failures", "all"].includes(mode)) return undefined;
  return { mode, markdown };
}

function exportMarkdown(ctx: ExtensionCommandContext, report: string): string {
  const directory = join(ctx.cwd, CONFIG_DIR_NAME, "reports");
  mkdirSync(directory, { recursive: true });
  const path = join(directory, `decisions-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(path, `# Decision report\n\n\`\`\`text\n${report}\n\`\`\`\n`, "utf8");
  return `exported ${join(CONFIG_DIR_NAME, "reports", path.split(/[\\/]/).pop()!)}`;
}

export default function decisionObserver(pi: ExtensionAPI): void {
  let config = DEFAULT_CONFIG;
  let currentProjectHash = "";
  let currentSessionHash = "";
  let currentLedgerPath = "";
  let runSequence = 0;

  const configure = (ctx: ExtensionContext | ExtensionCommandContext) => {
    config = loadConfig(ctx.cwd, ctx.isProjectTrusted());
    currentProjectHash = projectHash(ctx.cwd);
    currentSessionHash = sessionHash(ctx);
    currentLedgerPath = ledgerPath(currentProjectHash);
  };

  const records = () => currentLedgerPath ? retained(parseLedger(currentLedgerPath), config) : [];
  const updateStatus = (ctx: ExtensionContext | ExtensionCommandContext, values = records()) => {
    if (ctx.mode !== "tui") return;
    if (!config.enabled || values.length === 0) {
      ctx.ui.setStatus("decision-observer", undefined);
      return;
    }
    const valid = values.filter((record) => record.status === "validated").length;
    const failed = values.filter((record) => record.status === "failed").length;
    const open = values.filter((record) => record.status === "proposed" || record.status === "unknown").length;
    ctx.ui.setStatus("decision-observer", `D ✓${valid} ✗${failed} ?${open}`);
  };

  const reportCommand = async (args: string, ctx: ExtensionCommandContext) => {
    configure(ctx);
    if (!config.enabled) {
      ctx.ui.notify(`Decision Observer disabled. Opt in via ${join(CONFIG_DIR_NAME, CONFIG_NAME)}`, "warning");
      return;
    }
    const parsed = parseReportArgs(args);
    if (!parsed) {
      ctx.ui.notify("Usage: /decision-report [last|7d|30d|open|failures|all] [--markdown]", "warning");
      return;
    }
    const report = formatDecisionReport(records(), parsed.mode, readLoopRuns(currentProjectHash));
    if (parsed.markdown) ctx.ui.notify(exportMarkdown(ctx, report), "info");
    else ctx.ui.notify(report, "info");
  };

  pi.registerCommand("decision-report", {
    description: "Show bounded decision outcomes: /decision-report [last|7d|30d|open|failures|all] [--markdown]",
    handler: reportCommand,
  });

  pi.registerCommand("decision-show", {
    description: "Show one decision by id or key: /decision-show <id|key>",
    handler: async (args, ctx) => {
      configure(ctx);
      if (!config.enabled) {
        ctx.ui.notify(`Decision Observer disabled. Opt in via ${join(CONFIG_DIR_NAME, CONFIG_NAME)}`, "warning");
        return;
      }
      const query = args.trim().toLowerCase();
      if (!query) {
        ctx.ui.notify("Usage: /decision-show <id|key>", "warning");
        return;
      }
      const values = records();
      const record = [...values].reverse().find((item) => item.id.toLowerCase() === query || item.key?.toLowerCase() === query);
      ctx.ui.notify(record ? [`Decision ${record.id}`, ...detailLines(record, readLoopRuns(currentProjectHash))].join("\n") : `Decision not found: ${args.trim()}`, record ? "info" : "warning");
    },
  });

  pi.registerCommand("decisions", {
    description: "Open Decision Observatory dashboard",
    handler: async (_args, ctx) => {
      configure(ctx);
      if (!config.enabled) {
        ctx.ui.notify(`Decision Observer disabled. Opt in via ${join(CONFIG_DIR_NAME, CONFIG_NAME)}`, "warning");
        return;
      }
      if (ctx.mode !== "tui") {
        ctx.ui.notify(formatDecisionReport(records(), "30d", readLoopRuns(currentProjectHash)), "info");
        return;
      }
      await ctx.ui.custom<void>((tui, theme, _keybindings, done) => new DecisionDashboard(
        records(),
        readLoopRuns(currentProjectHash),
        theme,
        () => tui.requestRender(),
        () => done(undefined),
        records,
        () => exportMarkdown(ctx, formatDecisionReport(records(), "30d", readLoopRuns(currentProjectHash))),
      ), {
        overlay: true,
        overlayOptions: { anchor: "center", width: "90%", minWidth: 50, maxHeight: "80%" },
      });
    },
  });

  pi.on("session_start", (_event, ctx) => {
    configure(ctx);
    const values = config.enabled && existsSync(currentLedgerPath)
      ? updateLedger(currentLedgerPath, config, () => undefined)
      : records();
    updateStatus(ctx, values);
  });

  pi.on("before_agent_start", (_event, ctx) => {
    if (!currentProjectHash || projectHash(ctx.cwd) !== currentProjectHash) configure(ctx);
    runSequence += 1;
  });

  pi.on("message_end", (event, ctx) => {
    if (!config.enabled || event.message.role !== "assistant") return;
    const markers = parseDecisionMarkers(assistantText(event.message), config);
    if (markers.length === 0) return;
    const timestamp = new Date((event.message as { timestamp?: number }).timestamp || Date.now()).toISOString();
    const values = updateLedger(currentLedgerPath, config, (ledger) => applyDecisionMarkers(ledger, markers, {
      projectHash: currentProjectHash,
      sessionHash: currentSessionHash,
      runSequence,
      timestamp,
      captureCommits: config.captureCommits,
    }));
    updateStatus(ctx, values);
  });

  pi.on("session_tree", (_event, ctx) => {
    configure(ctx);
    updateStatus(ctx);
  });
}
