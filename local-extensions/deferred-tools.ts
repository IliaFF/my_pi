import { buildSessionContext, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const managed = new Set(["remote", "preview_export", "context_list", "context_stats", "context_purge", "tool_search"]);

export default function deferredTools(pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    let recorded: Set<string> | undefined;
    for (const message of buildSessionContext(ctx.sessionManager.getBranch()).messages) {
      if (message.role !== "system" || (!message.toolsAdded && !message.toolsRemoved)) continue;
      recorded ??= new Set();
      for (const tool of message.toolsRemoved ?? []) recorded.delete(tool.name);
      for (const tool of message.toolsAdded ?? []) recorded.add(tool.name);
    }
    if (!recorded) return;
    // SDK defaults override a reopened transcript; restore only this rollout's six names.
    const registered = new Set(pi.getAllTools().map(tool => tool.name));
    const active = pi.getActiveTools().filter(name => !managed.has(name));
    active.push(...[...recorded].filter(name => managed.has(name) && registered.has(name)));
    pi.setActiveTools(active);
  });
}
