import { mkdirSync, writeFileSync } from "node:fs";
import { basename, relative, resolve, sep } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

type CompactOptions = {
	customInstructions: string;
	onComplete?: () => void;
	onError?: (error: Error) => void;
};

type UnknownRecord = Record<string, unknown>;

type RecoveryState = {
	currentGoal: string;
	readFiles: string[];
	modifiedFiles: string[];
	commands: string[];
	decisions: string[];
	constraints: string[];
	blockers: string[];
	nextSteps: string[];
	validationResults: string[];
	recentUserMessages: string[];
};

type RuntimeState = {
	compactInFlight: boolean;
	followupPending: boolean;
	turn: number;
	lastCompactTurn: number;
	previousPercent?: number;
	lastRecoveryPath?: string;
	lastProjectRecoveryPath?: string;
	lastError?: string;
	lastTrigger?: string;
	lastTokens?: number;
	lastWindow?: number;
	lastPercent?: number;
	lastCompletedAt?: string;
	lastSkippedAt?: string;
	lastSkipReason?: string;
	lastHistoryTokens?: number;
	lastHistoryMessages?: number;
	continuationMessage?: string;
	postCompactCheckPending: boolean;
};

const DEFAULT_EFFECTIVE_TOKENS = 170_000;
const DEFAULT_CONTEXT_WINDOW = 200_000;
const DEFAULT_THRESHOLD_TOKENS = 150_000;
const DEFAULT_THRESHOLD_PERCENT = (DEFAULT_THRESHOLD_TOKENS / DEFAULT_EFFECTIVE_TOKENS) * 100;
const DEFAULT_COOLDOWN_TURNS = 3;
const DEFAULT_KEEP_RECENT_TOKENS = 12_000;
const ESTIMATED_IMAGE_CHARS = 4_800;
export const ULTRA_INSTRUCTIONS = `These rules override conflicting preservation guidance above.

Hard output limit: 10,000 tokens. Prefer 2,000-6,000 tokens when sufficient for correct continuation. Density and recoverability matter more than narrative completeness.

Treat standalone recovery markers as authoritative workflow state, newer markers overriding older prose and previous summaries:
- [GOAL] is the active objective; keep the latest applicable goal.
- [DECISION] is a consequential choice; [SUPERSEDED] with the exact old description removes it.
- [CONSTRAINT] is durable; [REVOKED] with the exact old description removes it.
- [BLOCKER] is active only until a matching [RESOLVED] marker; never carry resolved blockers forward.
- [NEXT] is immediate pending work; [COMPLETED] with the exact step removes it.
- [VALIDATION] is exact evidence. Preserve command, exit status, test counts, diagnostics, and exact error text when relevant.

Use the required structured checkpoint format, with these rules:
- Keep only information needed to continue correctly.
- Done: at most 10 recent or continuation-critical items. Collapse older completed history into one aggregate line only when still useful.
- Constraints & Preferences: separate durable constraints from temporary implementation decisions.
- Key Decisions: retain current decisions and brief rationale; remove superseded choices.
- Blocked: include unresolved blockers only.
- Next Steps: ordered, concrete, pending actions only.
- Critical Context: include exact validation results and external artifact pointers, not bulky artifact contents.
- Preserve exact file paths, symbols, commands, versions, test counts, exit codes, and unresolved error messages.
- Omit raw logs, repeated explanations, stale exploration, abandoned branches, conversational filler, and details recoverable from cited files or artifact pointers.
- Never claim unfinished or unvalidated work is complete.`;

export const SUMMARY_CONTRACT_ID = "recovery-v4-chronological-10k";
const FALLBACK_RESTORE_MESSAGE =
	"Продолжай после автосжатия. Сначала восстановись по recovery packet, затем продолжай с текущего next step. Не перечитывай raw logs/large dirs без необходимости.";
const VALIDATED_RESTORE_MESSAGE =
	"Продолжай после автосжатия по validated compact summary и текущему next step. Recovery packet — только emergency fallback при явной потере state; без необходимости не читай его или raw logs/large dirs.";

function envNumber(name: string, fallback: number): number {
	const raw = process.env[name];
	if (!raw) return fallback;
	const value = Number(raw);
	return Number.isFinite(value) && value > 0 ? value : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
	const raw = process.env[name];
	if (!raw) return fallback;
	return /^(1|true|yes|on)$/i.test(raw) ? true : /^(0|false|no|off)$/i.test(raw) ? false : fallback;
}

function notify(ctx: ExtensionContext, message: string, type: "info" | "warning" | "error" = "info"): void {
	if (ctx.hasUI) ctx.ui.notify(message, type);
}

function slug(value: string, fallback: string): string {
	return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
}

function yamlString(value: string): string {
	return JSON.stringify(value);
}

function mdList(items: string[], empty = "- none"): string {
	if (!items.length) return empty;
	return items.map((item) => `- ${item}`).join("\n");
}

function truncate(value: string, max = 500): string {
	const clean = value.replace(/\s+/g, " ").trim();
	return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function uniqueLimit(items: string[], limit: number): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	for (const raw of items) {
		const item = truncate(raw, 700);
		if (!item || seen.has(item)) continue;
		seen.add(item);
		out.push(item);
		if (out.length >= limit) break;
	}
	return out;
}

function asRecord(value: unknown): UnknownRecord | undefined {
	return typeof value === "object" && value !== null ? value as UnknownRecord : undefined;
}

export function recoveryFollowupMessage(event: unknown, recoveryPath?: string): string {
	const compactionEntry = asRecord(asRecord(event)?.compactionEntry);
	const details = asRecord(compactionEntry?.details);
	const validated = details?.contract === SUMMARY_CONTRACT_ID && details?.validator === "passed";
	const base = validated ? VALIDATED_RESTORE_MESSAGE : FALLBACK_RESTORE_MESSAGE;
	if (!recoveryPath) return base;
	const label = validated ? "Emergency recovery packet" : "Recovery packet";
	return `${base}\n\n${label}: ${recoveryPath}`;
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function contentChars(content: unknown): number {
	if (typeof content === "string") return content.length;
	let chars = 0;
	for (const block of asArray(content)) {
		const rec = asRecord(block);
		if (!rec) continue;
		if ((rec.type === "text" || rec.type === "thinking") && typeof (rec.text ?? rec.thinking) === "string") {
			chars += String(rec.text ?? rec.thinking).length;
		} else if (rec.type === "image") {
			chars += ESTIMATED_IMAGE_CHARS;
		} else if (rec.type === "toolCall") {
			chars += String(rec.name ?? "").length + JSON.stringify(rec.arguments ?? {}).length;
		}
	}
	return chars;
}

export function estimateCompactionTokens(message: unknown): number {
	const rec = asRecord(message);
	if (!rec || typeof rec.role !== "string") return 0;
	let chars = 0;
	if (rec.role === "bashExecution") {
		chars = String(rec.command ?? "").length + String(rec.output ?? "").length;
	} else if (rec.role === "branchSummary" || rec.role === "compactionSummary") {
		chars = String(rec.summary ?? "").length;
	} else {
		chars = contentChars(rec.content);
	}
	return Math.ceil(chars / 4);
}

function isCutPointRole(role: unknown): boolean {
	return typeof role === "string" && role !== "toolResult";
}

function isTurnStartRole(role: unknown): boolean {
	return role === "user" || role === "bashExecution" || role === "custom" || role === "branchSummary" || role === "compactionSummary";
}

export type Compactability = { compactable: boolean; historyTokens: number; messages: number; reason: string };

/**
 * Mirrors Pi's cut-point rule on current context messages. Provider usage also
 * includes system prompt/tool schemas, which cannot be compacted; it must not be
 * used alone to decide whether ctx.compact() can discard session history.
 */
export function analyzeCompactability(messagesInput: unknown[], keepRecentTokens: number): Compactability {
	const messages = [...messagesInput];
	while (asRecord(messages[0])?.role === "compactionSummary") messages.shift();
	const historyTokens = messages.reduce((sum, message) => sum + estimateCompactionTokens(message), 0);
	const cutPoints = messages.map((message, index) => isCutPointRole(asRecord(message)?.role) ? index : -1).filter((index) => index >= 0);
	if (!cutPoints.length) return { compactable: false, historyTokens, messages: messages.length, reason: "session history has no cut point" };

	let accumulated = 0;
	let cutIndex = cutPoints[0];
	for (let i = messages.length - 1; i >= 0; i--) {
		accumulated += estimateCompactionTokens(messages[i]);
		if (accumulated < keepRecentTokens) continue;
		cutIndex = cutPoints.find((candidate) => candidate >= i) ?? cutPoints[0];
		break;
	}
	const cutRole = asRecord(messages[cutIndex])?.role;
	if (isTurnStartRole(cutRole)) {
		return { compactable: cutIndex > 0, historyTokens, messages: messages.length, reason: cutIndex > 0 ? "discardable history available" : "session history fits retained suffix" };
	}
	let turnStart = -1;
	for (let i = cutIndex; i >= 0; i--) {
		if (isTurnStartRole(asRecord(messages[i])?.role)) {
			turnStart = i;
			break;
		}
	}
	const compactable = turnStart >= 0 && cutIndex > turnStart;
	return { compactable, historyTokens, messages: messages.length, reason: compactable ? "discardable turn prefix available" : "session history has no discardable prefix" };
}

function setOrArrayToStrings(value: unknown): string[] {
	if (value instanceof Set) return [...value].filter((v): v is string => typeof v === "string");
	if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
	return [];
}

function projectSlug(cwd: string): string {
	return slug(basename(cwd || process.cwd()) || "project", "project");
}

function agentId(cwd: string): string {
	return slug(
		process.env.PI_AUTO_COMPACT_AGENT_ID
			?? process.env.PI_STACK_AGENT_ID
			?? process.env.PI_AGENT_NAME
			?? `pi-${projectSlug(cwd)}`,
		`pi-${projectSlug(cwd)}`,
	);
}

function modelWindow(ctx: ExtensionContext): number {
	const model = (ctx as unknown as { model?: Record<string, unknown> }).model ?? {};
	const candidates = [model.contextWindow, model.context_window, model.maxInputTokens, model.maxTokens];
	for (const value of candidates) {
		if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
	}
	return envNumber("PI_AUTO_COMPACT_CONTEXT_WINDOW_TOKENS", DEFAULT_CONTEXT_WINDOW);
}

function effectiveWindow(ctx: ExtensionContext): number {
	const cap = envNumber("PI_AUTO_COMPACT_EFFECTIVE_TOKENS", DEFAULT_EFFECTIVE_TOKENS);
	return Math.min(modelWindow(ctx), cap);
}

function safePathUnder(dir: string, file: string): string {
	const path = resolve(dir, file);
	const rel = relative(dir, path);
	if (rel.startsWith("..") || rel.includes(sep) || resolve(dir) === path) throw new Error("Unsafe recovery path");
	return path;
}

function globalRecoveryDir(): string {
	const dir = resolve(process.env.HOME ?? process.cwd(), ".pi", "agent", "recovery");
	mkdirSync(dir, { recursive: true });
	return dir;
}

function globalRecoveryPath(ctx: ExtensionContext): string {
	const cwd = (ctx as unknown as { cwd?: string }).cwd ?? process.cwd();
	return safePathUnder(globalRecoveryDir(), `${projectSlug(cwd)}-${agentId(cwd)}-latest.md`);
}

function projectRecoveryPath(ctx: ExtensionContext): string | undefined {
	if (!envBool("PI_AUTO_COMPACT_PROJECT_RECOVERY", false)) return undefined;
	if (typeof ctx.isProjectTrusted === "function" && !ctx.isProjectTrusted()) return undefined;
	const cwd = (ctx as unknown as { cwd?: string }).cwd ?? process.cwd();
	const dir = resolve(cwd, ".pi-stack", "recovery");
	mkdirSync(dir, { recursive: true });
	return safePathUnder(dir, `${agentId(cwd)}-latest.md`);
}

function textFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	const parts: string[] = [];
	for (const block of asArray(content)) {
		const rec = asRecord(block);
		if (!rec) continue;
		if (typeof rec.text === "string") parts.push(rec.text);
		else if (rec.type === "toolCall" && typeof rec.name === "string") {
			const args = asRecord(rec.arguments) ?? {};
			parts.push(`tool:${rec.name} ${JSON.stringify(args).slice(0, 500)}`);
		}
	}
	return parts.join("\n");
}

function entryMessage(entry: unknown): UnknownRecord | undefined {
	const rec = asRecord(entry);
	if (!rec) return undefined;
	if (rec.type === "message") return asRecord(rec.message);
	if (rec.type === "custom_message") return { role: "custom", content: typeof rec.content === "string" ? rec.content : JSON.stringify(rec.content ?? "") };
	if (rec.type === "compaction" || rec.type === "branch_summary") return { role: rec.type, content: typeof rec.summary === "string" ? rec.summary : "" };
	return undefined;
}

function collectToolDataFromMessage(message: UnknownRecord, readFiles: string[], modifiedFiles: string[], commands: string[]): void {
	for (const block of asArray(message.content)) {
		const rec = asRecord(block);
		if (!rec || rec.type !== "toolCall" || typeof rec.name !== "string") continue;
		const args = asRecord(rec.arguments) ?? {};
		const path = typeof args.path === "string" ? args.path : undefined;
		if (path && rec.name === "read") readFiles.push(path);
		if (path && (rec.name === "write" || rec.name === "edit")) modifiedFiles.push(path);
		if (rec.name === "bash" && typeof args.command === "string") commands.push(truncate(args.command, 300));
	}
}

function lineMatches(text: string, pattern: RegExp): string[] {
	return text
		.split(/\n+/)
		.map((line) => line.trim().replace(/^[-*]\s*/, ""))
		.filter((line) => line.length >= 8 && pattern.test(line))
		.map((line) => truncate(line, 500));
}

type RecoveryMarker = "GOAL" | "DECISION" | "SUPERSEDED" | "CONSTRAINT" | "REVOKED" | "BLOCKER" | "RESOLVED" | "NEXT" | "COMPLETED" | "VALIDATION";

const RECOVERY_MARKER_RE = /^\s*(?:[-*]\s*)?\[(GOAL|DECISION|SUPERSEDED|CONSTRAINT|REVOKED|BLOCKER|RESOLVED|NEXT|COMPLETED|VALIDATION)\]\s*:?\s*(.+?)\s*$/i;

type RecoveryMarkerEvent = { marker: RecoveryMarker; value: string };

type ReducedMarkedRecoveryState = {
	goals: string[];
	decisions: string[];
	constraints: string[];
	blockers: string[];
	nextSteps: string[];
	validations: string[];
};

function markedRecoveryEvents(text: string): RecoveryMarkerEvent[] {
	const events: RecoveryMarkerEvent[] = [];
	for (const line of text.split(/\n+/)) {
		const match = line.match(RECOVERY_MARKER_RE);
		if (!match) continue;
		const value = truncate(match[2], 700);
		if (value) events.push({ marker: match[1].toUpperCase() as RecoveryMarker, value });
	}
	return events;
}

function reduceMarkedRecoveryState(events: RecoveryMarkerEvent[]): ReducedMarkedRecoveryState {
	const goals: string[] = [];
	const validations: string[] = [];
	const active = {
		DECISION: new Map<string, string>(),
		CONSTRAINT: new Map<string, string>(),
		BLOCKER: new Map<string, string>(),
		NEXT: new Map<string, string>(),
	};
	const reopen = (kind: keyof typeof active, value: string) => {
		const key = markerIdentity(value);
		active[kind].delete(key);
		active[kind].set(key, value);
	};
	const close = (kind: keyof typeof active, value: string) => active[kind].delete(markerIdentity(value));
	for (const event of events) {
		switch (event.marker) {
			case "GOAL": goals.push(event.value); break;
			case "DECISION": reopen("DECISION", event.value); break;
			case "SUPERSEDED": close("DECISION", event.value); break;
			case "CONSTRAINT": reopen("CONSTRAINT", event.value); break;
			case "REVOKED": close("CONSTRAINT", event.value); break;
			case "BLOCKER": reopen("BLOCKER", event.value); break;
			case "RESOLVED": close("BLOCKER", event.value); break;
			case "NEXT": reopen("NEXT", event.value); break;
			case "COMPLETED": close("NEXT", event.value); break;
			case "VALIDATION": validations.push(event.value); break;
		}
	}
	return {
		goals,
		decisions: [...active.DECISION.values()],
		constraints: [...active.CONSTRAINT.values()],
		blockers: [...active.BLOCKER.values()],
		nextSteps: [...active.NEXT.values()],
		validations,
	};
}

function markerIdentity(value: string): string {
	return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function sessionBranchEntries(ctx?: ExtensionContext): unknown[] {
	try {
		const sm = (ctx as unknown as { sessionManager?: { getBranch?: () => unknown[] } })?.sessionManager;
		const branch = sm?.getBranch?.();
		return Array.isArray(branch) ? branch : [];
	} catch {
		return [];
	}
}

export function extractRecoveryState(event?: unknown, ctx?: ExtensionContext): RecoveryState {
	const ev = asRecord(event) ?? {};
	const prep = asRecord(ev.preparation) ?? {};
	const fileOps = asRecord(prep.fileOps) ?? {};
	const readFiles: string[] = [...setOrArrayToStrings(fileOps.read)];
	const modifiedFiles: string[] = [...setOrArrayToStrings(fileOps.written), ...setOrArrayToStrings(fileOps.edited)];
	const commands: string[] = [];
	const decisions: string[] = [];
	const constraints: string[] = [];
	const blockers: string[] = [];
	const nextSteps: string[] = [];
	const validationResults: string[] = [];
	const recentUserMessages: string[] = [];
	const texts: string[] = [];
	const preparationMessages = [
		...asArray(prep.messagesToSummarize),
		...asArray(prep.turnPrefixMessages),
	] as UnknownRecord[];
	const branchEntries = asArray(ev.branchEntries).length ? asArray(ev.branchEntries) : sessionBranchEntries(ctx);
	const branchMessages = branchEntries.map(entryMessage).filter(Boolean) as UnknownRecord[];
	const allMessages = [...preparationMessages, ...branchMessages];
	const markerMessages = preparationMessages.length ? preparationMessages : branchMessages;
	const markerEvents: RecoveryMarkerEvent[] = [];

	for (const message of allMessages) {
		collectToolDataFromMessage(message, readFiles, modifiedFiles, commands);
		const text = textFromContent(message.content);
		if (!text) continue;
		texts.push(text);
		if (message.role === "user") recentUserMessages.push(truncate(text, 700));
	}
	for (const message of markerMessages) {
		if (message.role !== "assistant") continue;
		markerEvents.push(...markedRecoveryEvents(textFromContent(message.content)));
	}

	const combined = texts.join("\n");
	const hasMarkedState = markerEvents.length > 0;
	const marked = reduceMarkedRecoveryState(markerEvents);
	decisions.push(...(hasMarkedState
		? marked.decisions
		: lineMatches(combined, /\b(decision|decided|choose|chosen|accept|selected|use|must|should)\b|решил|решили|выбор|будем|нужно|надо|обязательно/i)));
	constraints.push(...marked.constraints);
	blockers.push(...(hasMarkedState
		? marked.blockers
		: lineMatches(combined, /error|failed|exception|cannot|enoent|syntaxerror|typeerror|blocked|blocker|risk|ошиб|падает|не работает|блок|риск/i)));
	nextSteps.push(...(hasMarkedState
		? marked.nextSteps
		: lineMatches(combined, /next|todo|plan|fix|implement|continue|следующ|дальше|потом|исправ|сделать|реализ/i)));
	validationResults.push(...marked.validations);

	return {
		currentGoal: marked.goals.length ? marked.goals[marked.goals.length - 1] : recentUserMessages.length ? recentUserMessages[recentUserMessages.length - 1] : "Captured automatically before compaction. If goal missing, infer from compact summary and latest user request.",
		readFiles: uniqueLimit(readFiles.sort(), 8),
		modifiedFiles: uniqueLimit(modifiedFiles.sort(), 15),
		commands: uniqueLimit(commands.reverse(), 5),
		decisions: uniqueLimit(decisions.reverse(), 12),
		constraints: uniqueLimit(constraints.reverse(), 12),
		blockers: uniqueLimit(blockers.reverse(), 12),
		nextSteps: uniqueLimit(nextSteps.reverse(), 12),
		validationResults: uniqueLimit(validationResults.reverse(), 12),
		recentUserMessages: uniqueLimit(recentUserMessages.reverse(), 3),
	};
}

type AuthoritativeRecoveryMarker = "GOAL" | "CONSTRAINT" | "DECISION" | "BLOCKER" | "VALIDATION" | "NEXT";
type AuthoritativeRecoveryEntry = { marker: AuthoritativeRecoveryMarker; value: string };

const AUTHORITATIVE_STATE_START = "<!-- authoritative-state:start -->";
const AUTHORITATIVE_STATE_END = "<!-- authoritative-state:end -->";

function oneLine(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

export function authoritativeRecoveryEntries(event?: unknown): AuthoritativeRecoveryEntry[] {
	const state = extractRecoveryState(event);
	const entries: AuthoritativeRecoveryEntry[] = [];
	const add = (marker: AuthoritativeRecoveryMarker, values: string[]) => {
		for (const raw of values) {
			const value = oneLine(raw);
			if (!value || value.startsWith("Captured automatically")) continue;
			entries.push({ marker, value });
		}
	};
	add("GOAL", [state.currentGoal]);
	add("CONSTRAINT", state.constraints);
	add("DECISION", state.decisions);
	add("BLOCKER", state.blockers);
	add("VALIDATION", state.validationResults.slice(0, 4));
	add("NEXT", state.nextSteps.slice(0, 3));
	return entries.filter((entry, index, all) => all.findIndex((candidate) => candidate.marker === entry.marker && markerIdentity(candidate.value) === markerIdentity(entry.value)) === index);
}

/** Add canonical active recovery markers after model generation, before strict validation. */
export function projectAuthoritativeState(summary: string, event?: unknown): string {
	const base = summary
		.replace(/\n?<!-- authoritative-state:start -->[\s\S]*?<!-- authoritative-state:end -->\n?/gi, "\n")
		.split("\n")
		.filter((line) => !RECOVERY_MARKER_RE.test(line))
		.join("\n")
		.trim();
	const entries = authoritativeRecoveryEntries(event);
	if (!entries.length) return base;
	const block = [
		AUTHORITATIVE_STATE_START,
		"### Authoritative State",
		...entries.map((entry) => `[${entry.marker}] ${entry.value}`),
		AUTHORITATIVE_STATE_END,
	].join("\n");
	return `${base}\n\n${block}`;
}

function sameAuthoritativeEntries(actual: RecoveryMarkerEvent[], expected: AuthoritativeRecoveryEntry[]): boolean {
	return actual.length === expected.length && actual.every((entry, index) => {
		const wanted = expected[index];
		return entry.marker === wanted.marker && markerIdentity(entry.value) === markerIdentity(wanted.value);
	});
}

/** Validate exact canonical marker ledger, while allowing closed work to remain ordinary Done prose. */
export function validateProjectedAuthoritativeState(summary: string, event?: unknown): string[] {
	const expected = authoritativeRecoveryEntries(event);
	const starts = summary.split(AUTHORITATIVE_STATE_START).length - 1;
	const ends = summary.split(AUTHORITATIVE_STATE_END).length - 1;
	const allMarkers = markedRecoveryEvents(summary);
	if (!expected.length) return starts || ends || allMarkers.length ? ["unexpected authoritative state block"] : [];
	const block = summary.match(/<!-- authoritative-state:start -->\s*\n### Authoritative State\s*\n([\s\S]*?)\n<!-- authoritative-state:end -->/i);
	const errors: string[] = [];
	if (starts !== 1 || ends !== 1 || !block) errors.push("authoritative state block must appear exactly once");
	const blockMarkers = block ? markedRecoveryEvents(block[1]) : [];
	if (!sameAuthoritativeEntries(blockMarkers, expected)) errors.push("canonical authoritative state does not match chronological ledger");
	if (allMarkers.length !== blockMarkers.length || !sameAuthoritativeEntries(allMarkers, expected)) errors.push("recovery marker found outside canonical authoritative state block");
	return errors;
}

function recoveryBody(ctx: ExtensionContext, reason: string, usagePercent: number, tokens: number, window: number, event?: unknown): string {
	const cwd = (ctx as unknown as { cwd?: string }).cwd ?? process.cwd();
	const now = new Date().toISOString();
	const state = extractRecoveryState(event, ctx);
	const summaryModel = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "current-pi-model";
	return `---
agent_id: ${yamlString(agentId(cwd))}
project: ${yamlString(projectSlug(cwd))}
cwd: ${yamlString(cwd)}
timestamp: ${yamlString(now)}
source: auto-ultra-compact
reason: ${yamlString(reason)}
context_tokens: ${tokens}
effective_window: ${window}
context_usage_percent: ${usagePercent.toFixed(1)}
summary_engine: current-model-custom-with-pi-built-in-fallback
summary_model: ${yamlString(summaryModel)}
summary_contract: ${yamlString(SUMMARY_CONTRACT_ID)}
summary_contract_source: "~/.pi/agent/extensions/auto-ultra-compact/index.ts#ULTRA_INSTRUCTIONS"
---

# Recovery Packet: ${agentId(cwd)}

## Restore sequence

1. Read this recovery packet.
2. Read compact summary already injected by Pi.
3. Restore current goal, durable constraints, current decisions, validation evidence, changed files, unresolved blockers, and next step.
4. Read project AGENTS.md / CLAUDE.md / .pi-stack/navigation/project-map.md only if present and needed.
5. Continue from latest unfinished user request.

## Current goal

${state.currentGoal}

## Recent user messages

${mdList(state.recentUserMessages)}

## Durable constraints

${mdList(state.constraints)}

## Current decisions

${mdList(state.decisions)}

## Validation results

${mdList(state.validationResults)}

## Unresolved blockers / errors / risks

${mdList(state.blockers)}

## Changed files

${mdList(state.modifiedFiles)}

## Read files

${mdList(state.readFiles)}

## Recent commands

${mdList(state.commands)}

## Next steps

${mdList(state.nextSteps, "- Continue from latest unfinished user request. If ambiguous, ask one concise question.")}

## State pointers

- CWD: \`${cwd}\`
- Recovery packet: \`${globalRecoveryPath(ctx)}\`
- Project recovery mirror: \`${projectRecoveryPath(ctx) ?? "disabled"}\`
- Context usage: ${tokens}/${window} tokens (${usagePercent.toFixed(1)}%)
- Trigger reason: ${reason}
- Summary path: one attempt with the current selected Pi model and deterministic validation; any failure immediately uses Pi built-in compaction. Contract \`${SUMMARY_CONTRACT_ID}\` comes from \`~/.pi/agent/extensions/auto-ultra-compact/index.ts#ULTRA_INSTRUCTIONS\`.

## Do not reread by default

- Full raw logs.
- Full large directories.
- Full command outputs or artifacts.
- Broad files when grep/search/slices suffice.
`;
}

function writeRecoveryFiles(ctx: ExtensionContext, state: RuntimeState, reason: string, usagePercent: number, tokens: number, window: number, event?: unknown): string {
	const body = recoveryBody(ctx, reason, usagePercent, tokens, window, event);
	const globalPath = globalRecoveryPath(ctx);
	writeFileSync(globalPath, body, "utf8");
	state.lastRecoveryPath = globalPath;
	state.lastProjectRecoveryPath = undefined;
	const mirrorPath = projectRecoveryPath(ctx);
	if (mirrorPath) {
		writeFileSync(mirrorPath, body, "utf8");
		state.lastProjectRecoveryPath = mirrorPath;
	}
	state.lastError = undefined;
	return globalPath;
}

function runCompact(pi: ExtensionAPI, ctx: ExtensionContext, runtime: RuntimeState, recoveryPath: string): void {
	const compactFn = (ctx as unknown as { compact?: (options: CompactOptions) => void }).compact;
	if (typeof compactFn !== "function") {
		runtime.compactInFlight = false;
		runtime.followupPending = false;
		runtime.continuationMessage = undefined;
		runtime.lastError = "ctx.compact unavailable";
		notify(ctx, "auto-ultra-compact: ctx.compact unavailable", "warning");
		return;
	}
	try {
		compactFn({
			customInstructions: ULTRA_INSTRUCTIONS,
			onComplete: () => {
				const continuationMessage = runtime.continuationMessage;
				runtime.continuationMessage = undefined;
				runtime.compactInFlight = false;
				runtime.lastCompletedAt = new Date().toISOString();
				runtime.lastError = undefined;
				runtime.postCompactCheckPending = true;
				notify(ctx, `auto-ultra-compact complete; recovery: ${recoveryPath}`, "info");
				// `session_compact` fires while Pi's manual-compaction controller is
				// still active. Sending there is rejected. `onComplete` runs after
				// controller cleanup, so extension-triggered continuation is safe here.
				if (continuationMessage) pi.sendUserMessage(continuationMessage, { deliverAs: "followUp" });
			},
			onError: (error: Error) => {
				runtime.compactInFlight = false;
				runtime.followupPending = false;
				runtime.continuationMessage = undefined;
				if (/already compacted/i.test(error.message)) {
					runtime.lastCompletedAt = new Date().toISOString();
					runtime.lastError = undefined;
					notify(ctx, `auto-ultra-compact skipped; Pi already compacted: ${recoveryPath}`, "info");
					return;
				}
				if (/nothing to compact|session too small/i.test(error.message)) {
					runtime.lastSkippedAt = new Date().toISOString();
					runtime.lastSkipReason = "Pi reported no compactable session history";
					runtime.lastError = undefined;
					return;
				}
				runtime.lastError = error.message;
				notify(ctx, `auto-ultra-compact failed: ${error.message}`, "error");
			},
		});
	} catch (error) {
		runtime.compactInFlight = false;
		runtime.followupPending = false;
		runtime.continuationMessage = undefined;
		runtime.lastError = error instanceof Error ? error.message : String(error);
		notify(ctx, `auto-ultra-compact threw: ${runtime.lastError}`, "error");
	}
}

export function shouldSendContinuation(reason: "manual" | "threshold" | "overflow", extensionTriggered: boolean): boolean {
	return extensionTriggered || reason !== "manual";
}

function statusText(ctx: ExtensionContext, runtime: RuntimeState, threshold: number, cooldownTurns: number, followup: boolean): string {
	const cooldownRemaining = Math.max(0, cooldownTurns - (runtime.turn - runtime.lastCompactTurn));
	const summaryModel = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "unavailable";
	return [
		"auto-ultra-compact status",
		`enabled: true`,
		`thresholdPercent: ${threshold}`,
		`effectiveCapTokens: ${envNumber("PI_AUTO_COMPACT_EFFECTIVE_TOKENS", DEFAULT_EFFECTIVE_TOKENS)}`,
		`cooldownTurns: ${cooldownTurns}`,
		`cooldownRemainingTurns: ${Number.isFinite(cooldownRemaining) ? cooldownRemaining : 0}`,
		`turn: ${runtime.turn}`,
		`compactInFlight: ${runtime.compactInFlight}`,
		`followupEnabled: ${followup}`,
		`followupPending: ${runtime.followupPending}`,
		`postCompactCheckPending: ${runtime.postCompactCheckPending}`,
		`lastTrigger: ${runtime.lastTrigger ?? "none"}`,
		`lastTokens: ${runtime.lastTokens ?? "unknown"}`,
		`lastWindow: ${runtime.lastWindow ?? "unknown"}`,
		`lastPercent: ${runtime.lastPercent?.toFixed(1) ?? "unknown"}`,
		`lastRecovery: ${runtime.lastRecoveryPath ?? "none"}`,
		`lastProjectRecovery: ${runtime.lastProjectRecoveryPath ?? "disabled"}`,
		`lastCompletedAt: ${runtime.lastCompletedAt ?? "none"}`,
		`lastSkippedAt: ${runtime.lastSkippedAt ?? "none"}`,
		`lastSkipReason: ${runtime.lastSkipReason ?? "none"}`,
		`lastHistoryTokens: ${runtime.lastHistoryTokens ?? "unknown"}`,
		`lastHistoryMessages: ${runtime.lastHistoryMessages ?? "unknown"}`,
		`lastError: ${runtime.lastError ?? "none"}`,
		`summaryEngine: current-model-custom-with-pi-built-in-fallback`,
		`summaryModel: ${summaryModel}`,
		`summaryContract: ${SUMMARY_CONTRACT_ID}`,
		`summaryMaxTokens: 10000`,
		`untrustedCodeExecution: disabled`,
	].join("\n");
}

export default function autoUltraCompact(pi: ExtensionAPI): void {
	const threshold = envNumber("PI_AUTO_COMPACT_PERCENT", DEFAULT_THRESHOLD_PERCENT);
	const followup = envBool("PI_AUTO_COMPACT_FOLLOWUP", true);
	const cooldownTurns = envNumber("PI_AUTO_COMPACT_COOLDOWN_TURNS", DEFAULT_COOLDOWN_TURNS);
	const runtime: RuntimeState = { compactInFlight: false, followupPending: false, postCompactCheckPending: false, lastCompactTurn: -Infinity, turn: 0 };

	function maybeCompact(ctx: ExtensionContext, reason: string): void {
		if (runtime.compactInFlight) return;
		const postCompactCheck = runtime.postCompactCheckPending;
		if (!postCompactCheck && runtime.turn - runtime.lastCompactTurn < cooldownTurns) return;
		const usage = ctx.getContextUsage?.();
		const tokens = usage?.tokens ?? null;
		if (typeof tokens !== "number" || !Number.isFinite(tokens)) return;
		const window = effectiveWindow(ctx);
		const percent = (tokens / window) * 100;
		const overThreshold = percent >= threshold;
		const crossed = runtime.previousPercent === undefined ? overThreshold : runtime.previousPercent < threshold && overThreshold;
		const sustained = overThreshold && runtime.turn - runtime.lastCompactTurn >= cooldownTurns;
		const ineffectiveCompaction = postCompactCheck && overThreshold;
		runtime.postCompactCheckPending = false;
		runtime.previousPercent = percent;
		runtime.lastTokens = tokens;
		runtime.lastWindow = window;
		runtime.lastPercent = percent;
		if (!crossed && !sustained && !ineffectiveCompaction) return;

		const keepRecentTokens = envNumber("PI_AUTO_COMPACT_KEEP_RECENT_TOKENS", DEFAULT_KEEP_RECENT_TOKENS);
		const compactability = analyzeCompactability(ctx.sessionManager.buildSessionContext().messages, keepRecentTokens);
		runtime.lastHistoryTokens = compactability.historyTokens;
		runtime.lastHistoryMessages = compactability.messages;
		if (!compactability.compactable) {
			const firstSkip = runtime.lastSkipReason !== compactability.reason;
			runtime.lastCompactTurn = runtime.turn;
			runtime.lastTrigger = `${reason}-skipped`;
			runtime.followupPending = false;
			runtime.lastSkippedAt = new Date().toISOString();
			runtime.lastSkipReason = compactability.reason;
			runtime.lastError = undefined;
			if (firstSkip) notify(ctx, `auto-ultra-compact skipped: ${compactability.reason}; session=${compactability.historyTokens} tokens, keepRecent=${keepRecentTokens}`, "info");
			return;
		}
		runtime.lastSkipReason = undefined;

		runtime.compactInFlight = true;
		runtime.followupPending = true;
		runtime.lastCompactTurn = runtime.turn;
		runtime.lastTrigger = reason;
		let recoveryPath: string;
		try {
			recoveryPath = writeRecoveryFiles(ctx, runtime, reason, percent, tokens, window);
		} catch (error) {
			runtime.compactInFlight = false;
			runtime.followupPending = false;
			runtime.lastError = `recovery write failed: ${error instanceof Error ? error.message : String(error)}`;
			notify(ctx, `auto-ultra-compact recovery write failed; compact skipped: ${runtime.lastError}`, "error");
			return;
		}
		notify(ctx, `auto-ultra-compact threshold ${percent.toFixed(1)}% >= ${threshold}%; recovery: ${recoveryPath}`, "info");
		runCompact(pi, ctx, runtime, recoveryPath);
	}

	pi.on("turn_end", (_event, ctx) => {
		runtime.turn++;
		try {
			maybeCompact(ctx, runtime.postCompactCheckPending ? "post-compact" : "threshold");
		} catch (error) {
			runtime.compactInFlight = false;
			runtime.followupPending = false;
			runtime.lastError = error instanceof Error ? error.message : String(error);
			notify(ctx, `auto-ultra-compact turn_end failed: ${runtime.lastError}`, "error");
		}
	});

	pi.on("session_before_compact", async (event, ctx) => {
		try {
			const prep = asRecord(asRecord(event)?.preparation);
			const extensionTriggered = runtime.compactInFlight && (runtime.lastTrigger === "threshold" || runtime.lastTrigger === "post-compact");
			const compactionReason = event.reason;
			const shouldFollowUp = shouldSendContinuation(compactionReason, extensionTriggered);
			const trigger = extensionTriggered ? runtime.lastTrigger! : compactionReason;
			const usage = ctx.getContextUsage?.();
			const tokensFromPrep = typeof prep?.tokensBefore === "number" ? prep.tokensBefore : undefined;
			const tokens = usage?.tokens ?? tokensFromPrep ?? 0;
			const window = effectiveWindow(ctx);
			const percent = window > 0 ? (tokens / window) * 100 : 0;
			runtime.lastTokens = tokens;
			runtime.lastWindow = window;
			runtime.lastPercent = percent;
			runtime.lastTrigger = trigger;
			runtime.compactInFlight = true;
			runtime.lastCompactTurn = runtime.turn;
			runtime.followupPending = shouldFollowUp;
			runtime.continuationMessage = undefined;
			writeRecoveryFiles(ctx, runtime, trigger, percent, tokens, window, event);
		} catch (error) {
			runtime.lastError = `recovery write failed: ${error instanceof Error ? error.message : String(error)}`;
			notify(ctx, `auto-ultra-compact recovery write failed: ${runtime.lastError}`, "warning");
		}
	});

	pi.on("session_compact", async (event, ctx) => {
		const shouldFollowUp = runtime.followupPending;
		runtime.followupPending = false;
		runtime.compactInFlight = false;
		runtime.lastCompletedAt = new Date().toISOString();
		const automatic = event.reason !== "manual" || runtime.lastTrigger === "threshold" || runtime.lastTrigger === "post-compact";
		if (automatic) runtime.postCompactCheckPending = true;
		if (!followup || !shouldFollowUp) return;
		const message = recoveryFollowupMessage(event, runtime.lastRecoveryPath);
		if (event.reason === "manual") {
			// ctx.compact() uses manual lifecycle. Pi rejects prompts until its
			// compaction controller is cleared after this event.
			runtime.continuationMessage = message;
			return;
		}
		// Built-in threshold/overflow compaction consumes queued messages after
		// session_compact, so enqueue immediately for that lifecycle.
		pi.sendUserMessage(message, { deliverAs: "followUp" });
	});

	function registerStatusCommand(name: string): void {
		pi.registerCommand(name, {
			description: "Show auto-ultra-compact diagnostics and last recovery packet.",
			handler: async (_args, ctx) => {
				const text = statusText(ctx, runtime, threshold, cooldownTurns, followup);
				notify(ctx, text, runtime.lastError ? "warning" : "info");
				const sender = (pi as unknown as { sendMessage?: (message: unknown, options?: unknown) => void }).sendMessage;
				if (typeof sender === "function") sender({ customType: "auto-ultra-compact-status", content: text, display: true }, { deliverAs: "nextTurn" });
			},
		});
	}

	pi.registerCommand("clear-context", {
		description: "Clear all LLM conversation context while keeping the current session file and history branch.",
		handler: async (_args, ctx) => {
			await ctx.waitForIdle();
			const previousLeafId = ctx.sessionManager.getLeafId();
			const contextMessages = ctx.sessionManager.buildSessionContext().messages;
			if (!previousLeafId || contextMessages.length === 0) {
				ctx.ui.setEditorText("");
				notify(ctx, "Context already empty", "info");
				return;
			}
			const firstInput = ctx.sessionManager.getBranch().find((entry) =>
				(entry.type === "message" && entry.message.role === "user") || entry.type === "custom_message",
			);
			if (!firstInput) {
				notify(ctx, "Cannot clear context safely: no root user/custom input found", "error");
				return;
			}
			// Ensure target is not current leaf: navigateTree intentionally no-ops when
			// targetId equals leafId, which is common for a lone custom/user input.
			pi.appendEntry("clear-context-pending", { requestedAt: new Date().toISOString(), previousLeafId });
			const result = await ctx.navigateTree(firstInput.id, { summarize: false });
			if (result.cancelled) {
				notify(ctx, "Context clear cancelled", "warning");
				return;
			}
			ctx.ui.setEditorText("");
			pi.appendEntry("clear-context", {
				clearedAt: new Date().toISOString(),
				previousLeafId,
				removedMessages: contextMessages.length,
			});
			notify(ctx, `Context cleared: ${contextMessages.length} messages removed; session history preserved`, "info");
		},
	});

	registerStatusCommand("auto-ultra-compact-status");
	registerStatusCommand("auto-ultra-compact-diagnostics");
}
