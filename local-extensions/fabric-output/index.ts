import { readFile } from "node:fs/promises";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { join, resolve } from "node:path";
import { compactNative, sourceOutput } from "./core.mjs";

type Config = { enabled?: boolean; thresholdBytes?: number; maxReturnedChars?: number };
const defaults: Required<Config> = { enabled: false, thresholdBytes: 32768, maxReturnedChars: 24576 };
const configPath = join(resolve(process.env.PI_CODING_AGENT_DIR || join(process.env.HOME || "~", ".pi", "agent")), "extensions", "fabric-output.json");

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async () => {
    let config = defaults;
    try { config = { ...defaults, ...JSON.parse(await readFile(configPath, "utf8")) }; } catch {}
    if (!config.enabled) return;
    pi.on("tool_result", async (event) => {
      if (event.toolName !== "fabric_exec" || event.content.some((part) => part.type === "image")) return;
      const source = await sourceOutput(event.content);
      if (!source.artifact || source.incomplete || Buffer.byteLength(source.text) < config.thresholdBytes) return;
      const trace = event.details?.trace, operations = Array.isArray(trace?.operations) ? trace.operations : [];
      const op = operations.length === 1 ? operations[0] : undefined;
      const metadata = { artifact: source.artifact, outcome: trace?.outcome ?? (event.isError ? "failed" : "succeeded"), ref: op?.ref, command: op?.ref === "pi.bash" ? (op.args?.command ?? op.args?.cmd) : undefined };
      return { content: [{ type: "text", text: compactNative(source.text, metadata, config.maxReturnedChars) }] };
    });
  });
}
