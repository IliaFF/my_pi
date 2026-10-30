import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

type CompactOptions = {
	customInstructions: string;
	onComplete?: () => void;
	onError?: (error: Error) => void;
};

type UnknownRecord = Record<string, unknown>;

type RuntimeState = {
	active: boolean;
	compactInFlight: boolean;
	followupPending: boolean;
	turn: number;
	lastCompactTurn: number;
	previousPercent?: number;
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

const DEFAULT_EFFECTIVE_TOKENS = 500_000;
const DEFAULT_CONTEXT_WINDOW = 200_000;
const DEFAULT_THRESHOLD_TOKENS = 500_000;
const DEFAULT_THRESHOLD_PERCENT = (DEFAULT_THRESHOLD_TOKENS / DEFAULT_EFFECTIVE_TOKENS) * 100;
const DEFAULT_COOLDOWN_TURNS = 3;
const DEFAULT_KEEP_RECENT_TOKENS = 12_000;
const ESTIMATED_IMAGE_CHARS = 4_800;
const TASK_RESTORE_INSTRUCTIONS =
	"После автосжатия сначала прочитай текущий TODO.md в корне проекта, если продолжаешь многошаговую проектную работу: только он определяет отслеживаемую задачу и следующий шаг. Для такой работы, если файл недоступен или активная задача неясна — остановись и спроси. Обсуждения, ответы на вопросы и небольшие одношаговые правки не требуют отдельной записи.";
const RESTORE_MESSAGE =
	`${TASK_RESTORE_INSTRUCTIONS} Для прочих деталей используй compact summary, файлы проекта и точечное восстановление истории через recall_folded.`;

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

function asRecord(value: unknown): UnknownRecord | undefined {
	return typeof value === "object" && value !== null ? value as UnknownRecord : undefined;
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

function runCompact(pi: ExtensionAPI, ctx: ExtensionContext, runtime: RuntimeState): void {
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
			customInstructions: "For multi-step project work, current TODO.md alone defines task status and next steps; reread it before resuming and ask if unclear. Discussions and small single-step edits need no task entry. Preserve exact evidence and unresolved constraints without inventing task state.",
			onComplete: () => {
				if (!runtime.active) return;
				const continuationMessage = runtime.continuationMessage;
				runtime.continuationMessage = undefined;
				runtime.compactInFlight = false;
				runtime.lastCompletedAt = new Date().toISOString();
				runtime.lastError = undefined;
				runtime.postCompactCheckPending = true;
				notify(ctx, "auto-ultra-compact complete", "info");
				// `session_compact` fires while Pi's manual-compaction controller is
				// still active. Sending there is rejected. `onComplete` runs after
				// controller cleanup, so extension-triggered continuation is safe here.
				if (continuationMessage) pi.sendUserMessage(continuationMessage, { deliverAs: "followUp" });
			},
			onError: (error: Error) => {
				if (!runtime.active) return;
				runtime.compactInFlight = false;
				runtime.followupPending = false;
				runtime.continuationMessage = undefined;
				if (/already compacted/i.test(error.message)) {
					runtime.lastCompletedAt = new Date().toISOString();
					runtime.lastError = undefined;
					notify(ctx, "auto-ultra-compact skipped; Pi already compacted", "info");
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
	const summaryModel = "none (deterministic context-fold)";
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
		`lastCompletedAt: ${runtime.lastCompletedAt ?? "none"}`,
		`lastSkippedAt: ${runtime.lastSkippedAt ?? "none"}`,
		`lastSkipReason: ${runtime.lastSkipReason ?? "none"}`,
		`lastHistoryTokens: ${runtime.lastHistoryTokens ?? "unknown"}`,
		`lastHistoryMessages: ${runtime.lastHistoryMessages ?? "unknown"}`,
		`lastError: ${runtime.lastError ?? "none"}`,
		`summaryEngine: context-fold-deterministic`,
		`summaryModel: ${summaryModel}`,
		`untrustedCodeExecution: disabled`,
	].join("\n");
}

export default function autoUltraCompact(pi: ExtensionAPI): void {
	const threshold = envNumber("PI_AUTO_COMPACT_PERCENT", DEFAULT_THRESHOLD_PERCENT);
	const followup = envBool("PI_AUTO_COMPACT_FOLLOWUP", true);
	const cooldownTurns = envNumber("PI_AUTO_COMPACT_COOLDOWN_TURNS", DEFAULT_COOLDOWN_TURNS);
	let runtime: RuntimeState = { active: true, compactInFlight: false, followupPending: false, postCompactCheckPending: false, lastCompactTurn: -Infinity, turn: 0 };
	const stopSession = () => {
		runtime.active = false;
		runtime.compactInFlight = false;
		runtime.followupPending = false;
		runtime.continuationMessage = undefined;
	};
	pi.on("session_shutdown", stopSession);
	pi.on("session_start", () => {
		stopSession();
		runtime = { active: true, compactInFlight: false, followupPending: false, postCompactCheckPending: false, lastCompactTurn: -Infinity, turn: 0 };
	});
	pi.on("session_compact_failed", (event) => {
		runtime.compactInFlight = false;
		runtime.followupPending = false;
		runtime.postCompactCheckPending = false;
		runtime.continuationMessage = undefined;
		runtime.lastError = event.aborted ? "Compaction cancelled" : event.errorMessage;
	});

	function maybeCompact(ctx: ExtensionContext, reason: string): void {
		if (!runtime.active) return;
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
		notify(ctx, `auto-ultra-compact threshold ${percent.toFixed(1)}% >= ${threshold}%`, "info");
		runCompact(pi, ctx, runtime);
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

	pi.on("session_compact", async (event, ctx) => {
		const extensionTriggered = runtime.compactInFlight && runtime.followupPending;
		const shouldFollowUp = shouldSendContinuation(event.reason, extensionTriggered);
		runtime.followupPending = false;
		runtime.compactInFlight = false;
		runtime.lastCompletedAt = new Date().toISOString();
		const automatic = event.reason !== "manual" || extensionTriggered;
		if (automatic) runtime.postCompactCheckPending = true;
		if (!followup || !shouldFollowUp) return;
		const message = RESTORE_MESSAGE;
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
			description: "Show auto-ultra-compact diagnostics.",
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
