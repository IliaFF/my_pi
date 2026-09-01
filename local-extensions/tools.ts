import type { ExtensionAPI, ExtensionContext, ToolInfo } from "@earendil-works/pi-coding-agent";
import { getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import { Container, type SettingItem, SettingsList } from "@earendil-works/pi-tui";

interface ToolsState {
	version?: 2;
	enabledTools: string[];
}

const CONTEXT_TOOLS = ["context_search", "context_get", "context_export", "context_list", "context_stats", "context_purge"] as const;
const STABLE_TOOLS = ["read", "grep", "find", "edit", "write", "bash", ...CONTEXT_TOOLS] as const;

export function toolsFromCompactedContext(text: string): string[] {
	return /ctxref:\/\//iu.test(text) ? ["context_recall"] : [];
}

export default function toolsExtension(pi: ExtensionAPI) {
	let enabledTools = new Set<string>();
	let allTools: ToolInfo[] = [];
	let manualSelection = false;
	let savedToolNames = new Set<string>();
	let compactedTools = new Set<string>();

	function persistState() {
		pi.appendEntry<ToolsState>("tools-config", { version: 2, enabledTools: [...enabledTools] });
	}

	function applyTools() {
		const next = [...enabledTools];
		const active = pi.getActiveTools();
		if (next.length === active.length && next.every((name, index) => name === active[index])) return;
		pi.setActiveTools(next);
	}

	function availableNames() {
		return new Set(allTools.map((tool) => tool.name));
	}

	function refreshAutomaticSelection(activeTools: string[] = []) {
		allTools = pi.getAllTools();
		const available = availableNames();
		enabledTools = new Set([...STABLE_TOOLS, ...activeTools, ...compactedTools].filter((name) => available.has(name)));
		applyTools();
	}

	function restoreFromBranch(ctx: ExtensionContext, activeTools: string[] = []) {
		allTools = pi.getAllTools();
		const branchEntries = ctx.sessionManager.getBranch();
		let savedTools: string[] | undefined;
		let savedVersion: number | undefined;
		for (const entry of branchEntries) {
			if (entry.type === "custom" && entry.customType === "tools-config") {
				const data = entry.data as ToolsState | undefined;
				if (Array.isArray(data?.enabledTools)) {
					savedTools = data.enabledTools;
					savedVersion = data.version;
				}
			}
		}

		if (savedTools) {
			manualSelection = true;
			const migratedTools = savedVersion === 2 ? savedTools : [...savedTools, ...CONTEXT_TOOLS];
			savedToolNames = new Set(migratedTools);
			const available = availableNames();
			enabledTools = new Set(migratedTools.filter((name) => available.has(name)));
			applyTools();
			return;
		}

		manualSelection = false;
		savedToolNames = new Set();
		const compactedContext = branchEntries
			.filter((entry) => entry.type === "compaction" && typeof entry.summary === "string")
			.map((entry) => entry.summary)
			.join("\n");
		compactedTools = new Set(toolsFromCompactedContext(compactedContext));
		refreshAutomaticSelection(activeTools);
	}


	pi.registerCommand("tools", {
		description: "Enable/disable model-facing tools explicitly",
		handler: async (_args, ctx) => {
			if (ctx.mode !== "tui") {
				ctx.ui.notify("/tools requires TUI mode", "error");
				return;
			}
			allTools = pi.getAllTools();
			await ctx.ui.custom((tui, theme, _kb, done) => {
				const items: SettingItem[] = allTools.map((tool) => ({
					id: tool.name,
					label: tool.name,
					currentValue: enabledTools.has(tool.name) ? "enabled" : "disabled",
					values: ["enabled", "disabled"],
				}));
				const container = new Container();
				container.addChild(new (class {
					render() { return [theme.fg("accent", theme.bold("Tool Configuration")), ""]; }
					invalidate() {}
				})());
				const settingsList = new SettingsList(
					items,
					Math.min(items.length + 2, 15),
					getSettingsListTheme(),
					(id, newValue) => {
						manualSelection = true;
						if (newValue === "enabled") enabledTools.add(id);
						else enabledTools.delete(id);
						savedToolNames = new Set(enabledTools);
						applyTools();
						persistState();
					},
					() => done(undefined),
				);
				container.addChild(settingsList);
				return {
					render(width: number) { return container.render(width); },
					invalidate() { container.invalidate(); },
					handleInput(data: string) { settingsList.handleInput?.(data); tui.requestRender(); },
				};
			});
		},
	});

	pi.on("session_start", async (_event, ctx) => restoreFromBranch(ctx));
	pi.on("session_tree", async (_event, ctx) => restoreFromBranch(ctx));
	pi.on("session_compact", async (_event, ctx) => restoreFromBranch(ctx, pi.getActiveTools()));
}
