import type { ExtensionContext, ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";
import { watchFile, unwatchFile } from "node:fs";
import { readFile } from "node:fs/promises";
import { formatQueuePanel, inspectTodo, type QueueSnapshot } from "./core.ts";
import { findTodoPath } from "./store.ts";

const WIDGET = "todo-queue";

export function createQueuePanel() {
  let generation = 0;
  let revision = 0;
  let collapsed = false;
  let ui: ExtensionUIContext | undefined;
  let unwatch: (() => void) | undefined;
  let refresh: (() => Promise<void>) | undefined;

  function stop() {
    generation++;
    revision++;
    unwatch?.();
    unwatch = undefined;
    refresh = undefined;
    try { ui?.setWidget(WIDGET, undefined); } catch { /* Old UI may already be disposed. */ }
    ui = undefined;
  }

  async function start(ctx: ExtensionContext & { isProjectTrusted?: () => boolean }) {
    stop();
    collapsed = false;
    if (!ctx.hasUI || ctx.mode !== "tui" || ctx.isProjectTrusted?.() === false) return;
    const version = generation;
    const targetUI = ctx.ui;
    let path: string;
    try { path = await findTodoPath(ctx.cwd); } catch { return; }
    if (version !== generation) return;
    ui = targetUI;
    refresh = async () => {
      if (version !== generation) return;
      const readRevision = ++revision;
      let state: QueueSnapshot | undefined;
      let issue = "";
      try {
        state = inspectTodo(await readFile(path, "utf8"));
      } catch (error: any) {
        issue = error?.code === "ENOENT" ? "" : "TODO: не удалось прочитать очередь";
      }
      if (version !== generation || readRevision !== revision) return;
      const visible = state && (state.current || state.pending.length || state.blocked.length);
      targetUI.setWidget(WIDGET, visible || issue ? (tui, theme) => ({
        render(width) {
          if (!state) return [truncateToWidth(theme.fg("error", issue), width, "…")];
          const halfHeight = Math.max(1, Math.floor((tui?.terminal.rows ?? 24) / 2));
          const budget = targetUI.getToolsExpanded?.() ? halfHeight : Math.min(6, halfHeight);
          return formatQueuePanel(state, collapsed, budget).map((line, index) => {
            if (index === 0) return truncateToWidth(theme.fg(state.current ? "accent" : "dim", line), width, "…");
            const glyph = line[3];
            const prefix = theme.fg("dim", line.slice(0, 3));
            const body = glyph === "◐" ? theme.fg("warning", glyph) + theme.fg("accent", theme.bold(line.slice(4)))
              : glyph === "!" ? theme.fg("warning", line.slice(3))
              : glyph === "+" ? theme.fg("dim", line.slice(3))
              : theme.fg("dim", glyph) + line.slice(4);
            return truncateToWidth(prefix + body, width, "…");
          });
        },
        invalidate() {},
      }) : undefined);
    };
    const update = refresh;
    const onChange = () => update().catch(() => console.warn("[todo-queue] panel refresh failed"));
    // Metadata polling survives the atomic rename used by queue mutations.
    watchFile(path, { persistent: false, interval: 1000 }, onChange);
    unwatch = () => unwatchFile(path, onChange);
    await update();
  }

  async function toggle(ctx: ExtensionContext) {
    if (!ctx.hasUI || ctx.mode !== "tui" || ctx.isProjectTrusted?.() === false) {
      stop();
      return;
    }
    if (!refresh) await start(ctx);
    if (!refresh) return;
    collapsed = !collapsed;
    await refresh();
  }

  return { start, stop, toggle };
}
