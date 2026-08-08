import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";
import { uuidv7, type Usage } from "@earendil-works/pi-ai";
import { complete } from "@earendil-works/pi-ai/compat";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { extractRecoveryState, SUMMARY_CONTRACT_ID, ULTRA_INSTRUCTIONS } from "./auto-ultra-compact/index.ts";

type RecordValue = Record<string, unknown>;
type ArchiveCandidate = { id: string; title: string; tags: string[]; sourceEntryIds: string[]; reason: string };
type ParsedResponse = { summary: string; candidates: ArchiveCandidate[] };
type CompletionResult = { content: unknown[]; stopReason: string; usage?: Usage };
type StoredItem = {
	id: string;
	title: string;
	tags: string[];
	reason: string;
	pointer: string;
	excerptFile: string;
	sha256: string;
	bytes: number;
	sourceEntryIds: string[];
};
type StoreManifest = {
	version: 1;
	sessionId: string;
	compactionId: string;
	createdAt: string;
	sourceSession?: string;
	contract: string;
	items: StoredItem[];
};

const SUMMARY_MAX_TOKENS = 9_000;
const MAX_ARCHIVE_ITEMS = 8;
const MAX_SOURCE_IDS_PER_ITEM = 8;
const MAX_EXCERPT_BYTES = 32 * 1024;
const MAX_STORE_BYTES_PER_COMPACTION = 128 * 1024;
const RECALL_DEFAULT_BYTES = 12_000;
const RECALL_MAX_BYTES = 50_000;
const STORE_ROOT = resolve(homedir(), ".pi", "agent", "context-store");

const SYSTEM_PROMPT = `You are a context compaction engine. Produce continuation state, not a conversational answer. Follow the output protocol exactly. Never call tools or invent source entry IDs.`;

const OUTPUT_PROTOCOL = `Return exactly two top-level blocks:

<checkpoint>
A Markdown checkpoint using Pi's exact sections: Goal; Constraints & Preferences; Progress with Done/In Progress/Blocked; Key Decisions; Next Steps; Critical Context.
</checkpoint>
<archive-candidates>
A JSON array with at most 8 objects. Each object has: id, title, tags, sourceEntryIds, reason. Select only noncritical historical details useful for possible later recall: older validations, resolved investigations, abandoned approaches, old Done detail, or bulky diagnostics. Use only entry IDs present in <source-entries>. Never archive current goals, durable constraints, current decisions, unresolved blockers, immediate next steps, or latest validation as their only representation. Return [] when no excerpt is useful.
</archive-candidates>`;

function asRecord(value: unknown): RecordValue | undefined {
	return typeof value === "object" && value !== null ? value as RecordValue : undefined;
}

function textFromContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content.map((block) => {
		const rec = asRecord(block);
		if (!rec) return "";
		if (typeof rec.text === "string") return rec.text;
		if (typeof rec.thinking === "string") return rec.thinking;
		if (rec.type === "toolCall") return `${String(rec.name ?? "tool")}(${JSON.stringify(rec.arguments ?? {})})`;
		return "";
	}).filter(Boolean).join("\n");
}

function entryText(entry: RecordValue): string {
	if (entry.type === "message") return textFromContent(asRecord(entry.message)?.content);
	if (entry.type === "custom_message") return textFromContent(entry.content);
	if (entry.type === "compaction" && typeof entry.summary === "string") return entry.summary;
	return "";
}

function xmlEscape(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sourceEntries(branchEntries: unknown[], firstKeptEntryId: string): RecordValue[] {
	const entries = branchEntries.map(asRecord).filter((entry): entry is RecordValue => Boolean(entry));
	const boundary = entries.findIndex((entry) => entry.id === firstKeptEntryId);
	const end = boundary >= 0 ? boundary : entries.length;
	let start = 0;
	for (let index = 0; index < end; index++) {
		if (entries[index].type === "compaction") start = index + 1;
	}
	return entries.slice(start, end).filter((entry) => typeof entry.id === "string" && entryText(entry));
}

function serializeEntries(entries: RecordValue[]): string {
	return entries.map((entry) => {
		const id = String(entry.id);
		const type = String(entry.type ?? "unknown");
		const role = entry.type === "message" ? String(asRecord(entry.message)?.role ?? "unknown") : type;
		return `<entry id="${xmlEscape(id)}" type="${xmlEscape(type)}" role="${xmlEscape(role)}">\n${xmlEscape(entryText(entry))}\n</entry>`;
	}).join("\n\n");
}

function responseText(response: { content: unknown[] }): string {
	return response.content.map((block) => {
		const rec = asRecord(block);
		return rec?.type === "text" && typeof rec.text === "string" ? rec.text : "";
	}).filter(Boolean).join("\n");
}

export function parseResponse(text: string): ParsedResponse {
	const summary = text.match(/<checkpoint>\s*([\s\S]*?)\s*<\/checkpoint>/i)?.[1]?.trim() ?? "";
	const rawCandidates = text.match(/<archive-candidates>\s*([\s\S]*?)\s*<\/archive-candidates>/i)?.[1]?.trim() ?? "[]";
	let decoded: unknown = [];
	try { decoded = JSON.parse(rawCandidates.replace(/^```(?:json)?\s*|\s*```$/gi, "")); } catch { decoded = []; }
	const candidates = Array.isArray(decoded) ? decoded.slice(0, MAX_ARCHIVE_ITEMS).map((item): ArchiveCandidate | undefined => {
		const rec = asRecord(item);
		if (!rec) return undefined;
		const id = typeof rec.id === "string" ? slug(rec.id, "item") : "item";
		const title = typeof rec.title === "string" ? rec.title.trim().slice(0, 160) : id;
		const reason = typeof rec.reason === "string" ? rec.reason.trim().slice(0, 300) : "Historical context";
		const tags = Array.isArray(rec.tags) ? rec.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 8).map((tag) => slug(tag, "tag")) : [];
		const sourceEntryIds = Array.isArray(rec.sourceEntryIds) ? rec.sourceEntryIds.filter((value): value is string => typeof value === "string").slice(0, MAX_SOURCE_IDS_PER_ITEM) : [];
		return sourceEntryIds.length ? { id, title, reason, tags, sourceEntryIds } : undefined;
	}).filter((item): item is ArchiveCandidate => Boolean(item)) : [];
	return { summary, candidates };
}

function normalize(value: string): string {
	return value.toLowerCase().replace(/[`*_\[\]]/g, "").replace(/\s+/g, " ").trim();
}

function markerValues(entries: RecordValue[], marker: string): string[] {
	const pattern = new RegExp(`^\\s*(?:[-*]\\s*)?\\[${marker}\\]\\s*:?\\s*(.+?)\\s*$`, "gim");
	const values: string[] = [];
	for (const entry of entries) {
		const text = entryText(entry);
		for (const match of text.matchAll(pattern)) values.push(match[1].trim());
	}
	return values;
}

export function validateSummary(summary: string, preparation: RecordValue, entries: RecordValue[]): string[] {
	const errors: string[] = [];
	const normalized = normalize(summary);
	for (const heading of ["## Goal", "## Constraints & Preferences", "## Progress", "### Done", "### In Progress", "### Blocked", "## Key Decisions", "## Next Steps", "## Critical Context"]) {
		if (!summary.includes(heading)) errors.push(`missing heading: ${heading}`);
	}
	const doneCount = (summary.match(/^- \[x\]/gm) ?? []).length;
	if (doneCount > 10) errors.push(`Done has ${doneCount} items; maximum is 10`);
	if (summary.length > 40_000) errors.push(`summary is too large: ${summary.length} chars`);
	const event = { preparation };
	const state = extractRecoveryState(event);
	const required = [state.currentGoal, ...state.constraints, ...state.decisions, ...state.blockers, ...state.validationResults.slice(0, 4), ...state.nextSteps.slice(0, 3)]
		.filter((value) => value && !value.startsWith("Captured automatically"));
	for (const value of required) {
		if (!normalized.includes(normalize(value))) errors.push(`missing authoritative state: ${value}`);
	}
	for (const marker of ["RESOLVED", "SUPERSEDED", "REVOKED", "COMPLETED"]) {
		for (const value of markerValues(entries, marker)) {
			if (normalized.includes(normalize(value))) errors.push(`closed state carried forward (${marker}): ${value}`);
		}
	}
	return [...new Set(errors)];
}

function slug(value: string, fallback: string): string {
	return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || fallback;
}

function sha256(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

function ensureStoreRoot(): void {
	mkdirSync(STORE_ROOT, { recursive: true, mode: 0o700 });
	chmodSync(STORE_ROOT, 0o700);
}

function atomicWrite(path: string, content: string): void {
	const temporary = `${path}.tmp-${process.pid}-${Date.now()}`;
	writeFileSync(temporary, content, { encoding: "utf8", mode: 0o600 });
	chmodSync(temporary, 0o600);
	renameSync(temporary, path);
}

function excerptPayload(candidate: ArchiveCandidate, entryMap: Map<string, RecordValue>, budget: number): string {
	const selected = candidate.sourceEntryIds.map((id) => entryMap.get(id)).filter((entry): entry is RecordValue => Boolean(entry));
	const records: RecordValue[] = [];
	let remaining = Math.min(MAX_EXCERPT_BYTES, budget);
	for (const entry of selected) {
		if (remaining < 512) break;
		const raw = JSON.stringify(entry);
		const fullHash = sha256(raw);
		const text = entryText(entry);
		const allowance = Math.max(256, remaining - 512);
		const excerpt = text.length <= allowance ? text : `${text.slice(0, Math.floor(allowance * 0.65))}\n\n[... exact middle omitted; full entry remains in source session ...]\n\n${text.slice(-Math.floor(allowance * 0.35))}`;
		const record = { sourceEntryId: entry.id, sourceType: entry.type, sourceSha256: fullHash, sourceBytes: Buffer.byteLength(raw), excerpt };
		const size = Buffer.byteLength(JSON.stringify(record));
		if (size > remaining) break;
		records.push(record);
		remaining -= size;
	}
	return JSON.stringify({ version: 1, title: candidate.title, tags: candidate.tags, reason: candidate.reason, records }, null, 2);
}

export function materializeStore(ctx: ExtensionContext, entries: RecordValue[], candidates: ArchiveCandidate[]): { manifest?: StoreManifest; pointers: string[] } {
	if (!candidates.length) return { pointers: [] };
	ensureStoreRoot();
	const sessionId = slug(ctx.sessionManager.getSessionId(), "session");
	const compactionId = `${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${String(entries.at(-1)?.id ?? "entry").slice(-8)}`;
	const dir = resolve(STORE_ROOT, sessionId, compactionId);
	if (!dir.startsWith(`${STORE_ROOT}${sep}`)) throw new Error("unsafe context-store directory");
	mkdirSync(dir, { recursive: true, mode: 0o700 });
	chmodSync(dir, 0o700);
	const entryMap = new Map(entries.map((entry) => [String(entry.id), entry]));
	const items: StoredItem[] = [];
	let remaining = MAX_STORE_BYTES_PER_COMPACTION;
	const used = new Set<string>();
	for (const candidate of candidates) {
		if (remaining < 512) break;
		let id = slug(candidate.id, `item-${items.length + 1}`);
		while (used.has(id)) id = `${id}-${items.length + 1}`;
		used.add(id);
		const payload = excerptPayload(candidate, entryMap, remaining);
		const parsed = JSON.parse(payload) as { records?: unknown[] };
		if (!parsed.records?.length) continue;
		const bytes = Buffer.byteLength(payload);
		if (bytes > remaining) continue;
		const excerptFile = `${id}.json`;
		atomicWrite(join(dir, excerptFile), payload);
		remaining -= bytes;
		const pointer = `ctxref://${sessionId}/${compactionId}/${id}`;
		items.push({ id, title: candidate.title, tags: candidate.tags, reason: candidate.reason, pointer, excerptFile, sha256: sha256(payload), bytes, sourceEntryIds: candidate.sourceEntryIds.filter((entryId) => entryMap.has(entryId)) });
	}
	if (!items.length) return { pointers: [] };
	const manifest: StoreManifest = { version: 1, sessionId, compactionId, createdAt: new Date().toISOString(), sourceSession: ctx.sessionManager.getSessionFile(), contract: SUMMARY_CONTRACT_ID, items };
	atomicWrite(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
	return { manifest, pointers: items.map((item) => item.pointer) };
}

function appendPointers(summary: string, manifest: StoreManifest | undefined): string {
	if (!manifest?.items.length) return summary;
	const lines = manifest.items.map((item) => `- ${item.title}: \`${item.pointer}\` (${item.tags.join(", ") || "historical"})`);
	return `${summary.trim()}\n\n### External Context Pointers\n${lines.join("\n")}`;
}

function parsePointer(pointer: string): { sessionId: string; compactionId: string; itemId: string; dir: string } {
	const match = pointer.match(/^ctxref:\/\/([a-z0-9-]+)\/([a-z0-9-]+)\/([a-z0-9-]+)$/i);
	if (!match) throw new Error("Invalid ctxref pointer");
	const [, sessionId, compactionId, itemId] = match;
	const dir = resolve(STORE_ROOT, sessionId, compactionId);
	if (!dir.startsWith(`${STORE_ROOT}${sep}`)) throw new Error("Unsafe ctxref path");
	return { sessionId, compactionId, itemId, dir };
}

export function recall(pointer: string, query: string | undefined, maxBytes: number): string {
	const { itemId, dir } = parsePointer(pointer);
	const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as StoreManifest;
	const item = manifest.items.find((candidate) => candidate.id === itemId && candidate.pointer === pointer);
	if (!item) throw new Error("ctxref item not found in manifest");
	const path = resolve(dir, item.excerptFile);
	if (!path.startsWith(`${dir}${sep}`)) throw new Error("Unsafe excerpt path");
	const content = readFileSync(path, "utf8");
	if (sha256(content) !== item.sha256) throw new Error("ctxref excerpt checksum mismatch");
	const cap = Math.min(Math.max(1000, maxBytes), RECALL_MAX_BYTES);
	if (!query?.trim()) return content.length <= cap ? content : `${content.slice(0, cap)}\n[truncated: ${content.length - cap} chars]`;
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
	const lines = content.split("\n");
	const selected = new Set<number>();
	for (let index = 0; index < lines.length; index++) {
		const line = lines[index].toLowerCase();
		if (terms.some((term) => line.includes(term))) for (let at = Math.max(0, index - 2); at <= Math.min(lines.length - 1, index + 2); at++) selected.add(at);
	}
	const output = [...selected].sort((a, b) => a - b).map((index) => lines[index]).join("\n");
	const result = output || `No excerpt lines matched query: ${query}`;
	return result.length <= cap ? result : `${result.slice(0, cap)}\n[truncated: ${result.length - cap} chars]`;
}

export async function summarizeOnce(
	call: (prompt: string) => Promise<CompletionResult>,
	prompt: string,
	preparation: RecordValue,
	entries: RecordValue[],
): Promise<{ parsed: ParsedResponse; usage?: Usage; validation: string[] } | undefined> {
	const response = await call(prompt);
	if (response.stopReason === "error") return undefined;
	const parsed = parseResponse(responseText(response));
	const validation = validateSummary(parsed.summary, preparation, entries);
	return { parsed, usage: response.usage, validation };
}

async function summarizeWithModel(event: RecordValue, ctx: ExtensionContext, model: NonNullable<ExtensionContext["model"]>): Promise<{ parsed: ParsedResponse; usage?: Usage; validation: string[] } | undefined> {
	const preparation = asRecord(event.preparation);
	if (!preparation || typeof preparation.firstKeptEntryId !== "string") return undefined;
	const branchEntries = Array.isArray(event.branchEntries) ? event.branchEntries : ctx.sessionManager.getBranch();
	const entries = sourceEntries(branchEntries, preparation.firstKeptEntryId);
	const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
	if (!auth.ok || !auth.apiKey) return undefined;
	const previousSummary = typeof preparation.previousSummary === "string" ? preparation.previousSummary : "";
	const prompt = `<source-entries>\n${serializeEntries(entries)}\n</source-entries>\n\n${previousSummary ? `<previous-summary>\n${previousSummary}\n</previous-summary>\n\n` : ""}${OUTPUT_PROTOCOL}\n\nCompaction contract:\n${ULTRA_INSTRUCTIONS}`;
	const signal = event.signal instanceof AbortSignal ? event.signal : undefined;
	const call = async (text: string): Promise<CompletionResult> => complete(model, { systemPrompt: SYSTEM_PROMPT, messages: [{ role: "user", content: [{ type: "text", text }], timestamp: Date.now() }] }, { apiKey: auth.apiKey, headers: auth.headers, env: auth.env, maxTokens: SUMMARY_MAX_TOKENS, reasoning: "low", cacheRetention: "none", sessionId: uuidv7(), signal });
	return summarizeOnce(call, prompt, preparation, entries);
}

export default function contextCompaction(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "context_recall",
		label: "Context Recall",
		description: "Resolve a ctxref:// pointer from external compaction storage with checksum validation and bounded output.",
		promptSnippet: "Recall archived context only when a ctxref pointer is relevant",
		parameters: Type.Object({
			pointer: Type.String({ description: "Exact ctxref://session/compaction/item pointer" }),
			query: Type.Optional(Type.String({ description: "Optional terms to filter excerpt lines" })),
			maxBytes: Type.Optional(Type.Integer({ minimum: 1000, maximum: RECALL_MAX_BYTES })),
		}),
		async execute(_toolCallId, params) {
			try {
				const text = recall(params.pointer, params.query, params.maxBytes ?? RECALL_DEFAULT_BYTES);
				return { content: [{ type: "text", text }], details: { pointer: params.pointer, verified: true } };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return { content: [{ type: "text", text: `context_recall failed: ${message}` }], details: { pointer: params.pointer, verified: false, error: message } };
			}
		},
	});

	pi.on("session_before_compact", async (rawEvent, ctx) => {
		const event = rawEvent as unknown as RecordValue;
		try {
			const attempt = async (model: NonNullable<ExtensionContext["model"]>, label: string) => {
				try {
					return await summarizeWithModel(event, ctx, model);
				} catch (error) {
					if (ctx.hasUI) ctx.ui.notify(`${label} compaction attempt failed: ${error instanceof Error ? error.message : String(error)}`, "warning");
					return undefined;
				}
			};
			const current = ctx.model;
			if (!current) {
				if (ctx.hasUI) ctx.ui.notify("No current model available; using Pi built-in compaction", "warning");
				return;
			}
			const result = await attempt(current, "Current-model");
			const summarizer = `${current.provider}/${current.id}`;
			if (!result || result.validation.length) {
				if (ctx.hasUI) ctx.ui.notify(`Compaction summary rejected; Pi built-in fallback${result?.validation.length ? `: ${result.validation.join("; ")}` : ""}`, "warning");
				return;
			}
			const preparation = asRecord(event.preparation)!;
			const branchEntries = Array.isArray(event.branchEntries) ? event.branchEntries : ctx.sessionManager.getBranch();
			const entries = sourceEntries(branchEntries, String(preparation.firstKeptEntryId));
			const stored = materializeStore(ctx, entries, result.parsed.candidates);
			const summary = appendPointers(result.parsed.summary, stored.manifest);
			return {
				compaction: {
					summary,
					firstKeptEntryId: preparation.firstKeptEntryId,
					tokensBefore: preparation.tokensBefore,
					usage: result.usage,
					details: { contract: SUMMARY_CONTRACT_ID, summarizer, modelSource: "current", validator: "passed", pointers: stored.pointers, manifest: stored.manifest ? join(STORE_ROOT, stored.manifest.sessionId, stored.manifest.compactionId, "manifest.json") : undefined },
				},
			};
		} catch (error) {
			if (ctx.hasUI) ctx.ui.notify(`Custom compaction failed; using Pi built-in fallback: ${error instanceof Error ? error.message : String(error)}`, "warning");
			return;
		}
	});
}
