import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const DEFAULT_DISABLED_TOOLS = new Set([
  "ffgrep",
  "readSeek_search",
  "readSeek_rename",
  "readSeek_hover",
]);

export default function leanTools(pi: ExtensionAPI) {
  const apply = () => {
    const active = pi.getActiveTools();
    const filtered = active.filter((name) => !DEFAULT_DISABLED_TOOLS.has(name));
    if (filtered.length !== active.length) pi.setActiveTools(filtered);
  };

  pi.on("session_start", async () => {
    setTimeout(apply, 0);
  });
  pi.on("before_agent_start", async () => apply());
}
