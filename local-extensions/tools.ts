/**
 * Tools Extension
 *
 * Provides a /tools command to enable/disable tools interactively.
 * Tool selection persists across session reloads and respects branch navigation.
 *
 * Usage:
 * 1. Copy this file to ~/.pi/agent/extensions/ or your project's .pi/extensions/
 * 2. Use /tools to open the tool selector
 */

import type { ExtensionAPI, ExtensionContext, ToolInfo } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import { Container, type SettingItem, SettingsList } from "@earendil-works/pi-tui";

// State persisted to session
interface ToolsState {
	enabledTools: string[];
}

const CORE_TOOLS = new Set([
	"read",
	"edit",
	"write",
	"bash",
	"fffind",
	"readSeek_grep",
	"readSeek_refs",
	"readSeek_def",
	"ask_user_question",
	"todo",
	"context_checkpoint",
	"context_timeline",
	"context_compact",
	"goal_complete",
	"goal_blocked",
	"search_tools",
	"ctx_execute",
	"ctx_batch_execute",
	"ctx_execute_file",
	"ctx_search",
	"project_context",
	"project_probe",
	"edit_verify",
	"targeted_test",
	"finish_gate",
]);

const ROUTES: Array<{ pattern: RegExp; tools: string[] }> = [
	{
		pattern: /\b(fix|edit|change|implement|refactor|test|validate|debug)\b|(исправ|редакт|измен|реализ|рефактор|тест|провер|отлад)[а-яё]*/iu,
		tools: ["edit_verify", "targeted_test", "finish_gate"],
	},
	{ pattern: /\bctx_index\b/iu, tools: ["ctx_index"] },
	{ pattern: /\bctx_fetch_and_index\b/iu, tools: ["ctx_fetch_and_index"] },
	{ pattern: /\bctx_stats\b/iu, tools: ["ctx_stats"] },
	{ pattern: /\bctx_doctor\b/iu, tools: ["ctx_doctor"] },
	{ pattern: /\bctx_upgrade\b/iu, tools: ["ctx_upgrade"] },
	{ pattern: /\bctx_purge\b/iu, tools: ["ctx_purge"] },
	{ pattern: /\bctx_insight\b/iu, tools: ["ctx_insight"] },
	{ pattern: /ctxref:\/\//iu, tools: ["context_recall"] },
	{
		pattern: /https?:\/\/|\b(web|internet|online|latest|today|citation|sources?|docs?)\b|(интернет|веб|актуальн|сегодня|источник|цитат|документац)[а-яё]*/iu,
		tools: ["web_search", "source_check", "fetch_content", "get_search_content"],
	},
	{
		pattern: /\b(subagents?|delegate|parallel|independent|comprehensive|research|audit|review)\b|(субагент|делегир|параллел|независим|комплексн|исследован|аудит|ревью)[а-яё]*/iu,
		tools: ["subagent"],
	},
	{
		pattern: /\b(async|background|wait for|long[- ]running)\b|(асинхрон|фон|дожд|длительн)[а-яё]*/iu,
		tools: ["subagent_wait"],
	},
	{
		pattern: /\b(pdf|html|png|preview|render|export|screenshot)\b|(превью|рендер|экспорт|визуализ|скриншот)[а-яё]*/iu,
		tools: ["preview_export"],
	},
	{ pattern: /\btelegram\b|телеграм[а-яё]*/iu, tools: ["telegram_attach", "telegram_message", "telegram_help"] },
	{ pattern: /\bmcp\b/iu, tools: ["mcp"] },
	{ pattern: /\bintercom\b|\bother pi session\b|(другая сессия|между сессиями)/iu, tools: ["intercom"] },
	{
		pattern: /\b(rename|identify symbol|hover symbol)\b|(переимен|идентифицир.*символ)[а-яё]*/iu,
		tools: ["readSeek_rename", "readSeek_hover"],
	},
];

export function toolsFromCompactedContext(text: string): string[] {
	// Compacted history mentions capabilities as historical facts (for example
	// "source of truth" or "Telegram enabled"). Replaying normal prompt routes
	// here causes permanent false-positive tool activation. Only ctxref pointers
	// require a tool immediately after compaction.
	return /ctxref:\/\//iu.test(text) ? ["context_recall"] : [];
}

const TOOL_SEARCH_ALIASES: Record<string, string> = {
	web_search: "поиск интернет веб актуальные данные источники",
	source_check: "проверка утверждения источники цитаты",
	fetch_content: "получить страницу ссылка видео контент",
	get_search_content: "результаты поиска полный контент",
	context_recall: "ctxref восстановить архивный контекст excerpt manifest",
	subagent: "субагент делегировать параллельно аудит ревью исследование",
	subagent_wait: "ждать фон асинхронная задача",
	preview_export: "pdf html png превью рендер экспорт скриншот",
	telegram_attach: "телеграм отправить файл вложение",
	telegram_message: "телеграм отправить сообщение",
	mcp: "сервер интеграция протокол",
	intercom: "другая сессия связь координация",
	readSeek_rename: "переименовать символ идентификатор",
	readSeek_hover: "определить символ идентификатор",
	project_context: "контекст проекта поиск файлов bounded retrieval",
	project_probe: "структура проекта стек git discovery probe",
	edit_verify: "изменить файл и сразу проверить compound edit validation",
	targeted_test: "целевой тест validation profile",
	finish_gate: "финальная проверка готовности validation gate",
};

export default function toolsExtension(pi: ExtensionAPI) {
	// Track enabled tools
	let enabledTools: Set<string> = new Set();
	let allTools: ToolInfo[] = [];
	let pendingPrompt = "";
	let manualSelection = false;
	let savedToolNames: Set<string> = new Set();

	// Persist current state
	function persistState() {
		pi.appendEntry<ToolsState>("tools-config", {
			enabledTools: Array.from(enabledTools),
		});
	}

	// Apply current tool selection
	function applyTools() {
		pi.setActiveTools(Array.from(enabledTools));
	}

	function enableTools(names: Iterable<string>) {
		const available = new Set(allTools.map((tool) => tool.name));
		let changed = false;
		for (const name of names) {
			if (available.has(name) && !enabledTools.has(name)) {
				enabledTools.add(name);
				changed = true;
			}
		}
		if (changed) applyTools();
		return changed;
	}

	function routePrompt(text: string) {
		for (const route of ROUTES) {
			if (route.pattern.test(text)) enableTools(route.tools);
		}
	}

	// Find the last tools-config entry in the current branch
	function restoreFromBranch(ctx: ExtensionContext) {
		allTools = pi.getAllTools();

		// Get entries in current branch only
		const branchEntries = ctx.sessionManager.getBranch();
		let savedTools: string[] | undefined;

		for (const entry of branchEntries) {
			if (entry.type === "custom" && entry.customType === "tools-config") {
				const data = entry.data as ToolsState | undefined;
				if (data?.enabledTools) {
					savedTools = data.enabledTools;
				}
			}
		}

		if (savedTools) {
			// Manual /tools selection is authoritative, including explicit opt-outs.
			manualSelection = true;
			savedToolNames = new Set(savedTools);
			const allToolNames = new Set(allTools.map((tool) => tool.name));
			enabledTools = new Set(savedTools.filter((name) => allToolNames.has(name)));
			applyTools();
		} else {
			manualSelection = false;
			savedToolNames = new Set();
			// Start lean. Specialized tools are activated additively by prompt routing
			// or search_tools, preserving provider prompt-cache compatibility.
			enabledTools = new Set(allTools.map((tool) => tool.name).filter((name) => CORE_TOOLS.has(name)));
			const compactedContext = branchEntries
				.filter((entry) => entry.type === "compaction" && typeof entry.summary === "string")
				.map((entry) => entry.summary)
				.join("\n");
			enableTools(toolsFromCompactedContext(compactedContext));
			applyTools();
		}
	}

	pi.registerTool({
		name: "search_tools",
		label: "Search Tools",
		description: "Find and enable currently inactive Pi tools by capability. Use when required capability is unavailable.",
		promptSnippet: "Search and enable specialized tools when active tools cannot perform the task",
		parameters: Type.Object({
			query: Type.String({ description: "Capability to find, concise English or Russian keywords" }),
			limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 10 })),
		}),
		async execute(_toolCallId, params) {
			allTools = pi.getAllTools();
			const terms = params.query.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? [];
			const matches = allTools
				.filter((tool) => tool.name !== "search_tools" && !enabledTools.has(tool.name))
				.map((tool) => {
					const haystack = `${tool.name} ${tool.description} ${TOOL_SEARCH_ALIASES[tool.name] ?? ""}`.toLowerCase();
					return { name: tool.name, score: terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0) };
				})
				.filter((match) => match.score > 0)
				.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
				.slice(0, params.limit ?? 5)
				.map((match) => match.name);

			if (matches.length === 0) {
				return { content: [{ type: "text", text: `No inactive tools found for: ${params.query}` }], details: { matches: [] } };
			}

			enableTools(matches);
			if (manualSelection) {
				for (const name of matches) savedToolNames.add(name);
				persistState();
			}
			return { content: [{ type: "text", text: `Enabled tools: ${matches.join(", ")}` }], details: { matches } };
		},
	});

	pi.on("before_agent_start", (event) => {
		pendingPrompt = event.prompt;
		allTools = pi.getAllTools();
		if (!manualSelection) {
			enableTools(CORE_TOOLS);
			routePrompt(pendingPrompt);
		}
		applyTools();
	});

	pi.on("agent_start", () => {
		// Some packages register tools late; resolve saved/core names again.
		allTools = pi.getAllTools();
		if (manualSelection) {
			const available = new Set(allTools.map((tool) => tool.name));
			enabledTools = new Set([...savedToolNames].filter((name) => available.has(name)));
		} else {
			enableTools(CORE_TOOLS);
			routePrompt(pendingPrompt);
		}
		applyTools();
	});

	// Register /tools command
	pi.registerCommand("tools", {
		description: "Enable/disable tools",
		handler: async (_args, ctx) => {
			if (ctx.mode !== "tui") {
				ctx.ui.notify("/tools requires TUI mode", "error");
				return;
			}

			// Refresh tool list
			allTools = pi.getAllTools();

			await ctx.ui.custom((tui, theme, _kb, done) => {
				// Build settings items for each tool
				const items: SettingItem[] = allTools.map((tool) => ({
					id: tool.name,
					label: tool.name,
					currentValue: enabledTools.has(tool.name) ? "enabled" : "disabled",
					values: ["enabled", "disabled"],
				}));

				const container = new Container();
				container.addChild(
					new (class {
						render(_width: number) {
							return [theme.fg("accent", theme.bold("Tool Configuration")), ""];
						}
						invalidate() {}
					})(),
				);

				const settingsList = new SettingsList(
					items,
					Math.min(items.length + 2, 15),
					getSettingsListTheme(),
					(id, newValue) => {
						manualSelection = true;
						// Update enabled state and apply immediately
						if (newValue === "enabled") {
							enabledTools.add(id);
						} else {
							enabledTools.delete(id);
						}
						savedToolNames = new Set(enabledTools);
						applyTools();
						persistState();
					},
					() => {
						// Close dialog
						done(undefined);
					},
				);

				container.addChild(settingsList);

				const component = {
					render(width: number) {
						return container.render(width);
					},
					invalidate() {
						container.invalidate();
					},
					handleInput(data: string) {
						settingsList.handleInput?.(data);
						tui.requestRender();
					},
				};

				return component;
			});
		},
	});

	// Restore state on session start
	pi.on("session_start", async (_event, ctx) => {
		restoreFromBranch(ctx);
	});

	// Restore state when navigating the session tree
	pi.on("session_tree", async (_event, ctx) => {
		restoreFromBranch(ctx);
	});

	pi.on("session_compact", async (_event, ctx) => {
		restoreFromBranch(ctx);
	});
}
