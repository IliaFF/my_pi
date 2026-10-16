import type { ExtensionContext, ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";
import { watchFile, unwatchFile } from "node:fs";
import { readFile } from "node:fs/promises";
import { formatQueuePanel, inspectTodo } from "./core.ts";
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
      let lines: string[];
      try {
        lines = formatQueuePanel(inspectTodo(await readFile(path, "utf8")), collapsed);
      } catch (error: any) {
        lines = error?.code === "ENOENT" ? [] : ["TODO: не удалось прочитать очередь"];
      }
      if (version !== generation || readRevision !== revision) return;
      const text = lines;
      targetUI.setWidget(WIDGET, text.length ? (_tui, theme) => ({
        render: (width) => text.map((line, index) => truncateToWidth(index === 0 ? theme.fg("accent", line) : line, width)),
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
