#!/usr/bin/env node
import { chmodSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join, resolve } from "node:path";

const packageRoot = resolve(process.argv[2] || "npm/node_modules/@spences10/pi-context");
const stateRoot = resolve(process.argv[3] || ".pi-context-test-state");
const useExistingState = process.argv[4] === "--existing";
const project = useExistingState ? process.cwd() : join(stateRoot, "project");
mkdirSync(project, { recursive: true, mode: 0o700 });
process.env.PI_CODING_AGENT_DIR = stateRoot;
if (!useExistingState) {
  process.env.MY_PI_CONTEXT_CONFIG = join(stateRoot, "context.json");
  writeFileSync(process.env.MY_PI_CONTEXT_CONFIG, JSON.stringify({
    version: 1, preset: "balanced", retention_days: 7, max_mb: 250,
    purge_on_shutdown: false, capture_max_bytes: 24576, capture_max_lines: 300,
    mcp_max_bytes: 51200, mcp_max_lines: 2000,
  }), { mode: 0o600 });
}
const dbPath = join(stateRoot, "context.db");
if (!useExistingState) writeFileSync(dbPath, "", { mode: 0o600 });
chmodSync(dbPath, 0o600);

const handlers = new Map();
const tools = new Map();
const commands = new Map();
const pi = {
  on(name, handler) { const list = handlers.get(name) || []; list.push(handler); handlers.set(name, list); },
  registerTool(tool) { tools.set(tool.name, tool); },
  registerCommand(name, command) { commands.set(name, command); },
};
const extension = (await import(pathToFileURL(join(packageRoot, "dist/index.js")))).default;
extension(pi);
if (tools.size !== 6) throw new Error(`expected 6 context tools, got ${tools.size}`);
const ctx = { cwd: project, sessionManager: { getSessionId: () => "isolated-session" } };
for (const handler of handlers.get("session_start") || []) await handler({}, ctx);

const marker = "NeedleAlphaBeta";
const rawSecret = "RUNTIME_TEST_SECRET_VALUE_123456789";
const original = Array.from({ length: 420 }, (_, index) => `${index}: ${marker} payload-${"x".repeat(70)}`).join("\n") + `\napi_key=${rawSecret}\n`;
let transformed;
for (const handler of handlers.get("tool_result") || []) {
  transformed = await handler({ toolName: "bash", input: { command: "generated test fixture" }, content: [{ type: "text", text: original }] }, ctx) || transformed;
}
const receipt = transformed?.content?.[0]?.text || "";
if (!receipt.startsWith("[context-sidecar]") || !receipt.includes("Source: ")) throw new Error("large output was not replaced by a context receipt");
const sourceId = receipt.match(/^Source: (.+)$/m)?.[1];
if (!sourceId) throw new Error("receipt source id missing");

const runTool = async (name, params) => tools.get(name).execute("test-call", params, undefined, undefined, ctx);
const searched = await runTool("context_search", { query: marker, source_id: sourceId, limit: 2 });
if (searched.details?.count < 1 || !searched.content[0].text.includes(marker)) throw new Error("context_search did not find marker");
const fetched = await runTool("context_get", { source_id: sourceId });
const fetchedText = fetched.content[0].text;
if (!fetchedText.includes(marker) || fetchedText.includes(rawSecret) || !fetchedText.includes("REDACTED")) throw new Error("context_get redacted reconstruction mismatch");
const exported = await runTool("context_export", { source_id: sourceId });
if (!exported.details?.exported || exported.details?.verified !== true) throw new Error("context_export did not verify full reconstruction");
const exportedText = readFileSync(exported.details.file_path, "utf8");
if (!exportedText.includes(marker) || exportedText.includes(rawSecret) || !exportedText.includes("REDACTED")) throw new Error("context_export redacted content mismatch");
const stats = await runTool("context_stats", {});
const statsText = stats.content[0].text;
if (!statsText.includes("Retention days: 7") || !statsText.includes("Max DB size: 250 MiB")) throw new Error("balanced retention is not effective");
const sqliteFiles = readdirSync(stateRoot).filter((name) => name === "context.db" || name === "context.db-wal" || name === "context.db-shm");
if (sqliteFiles.some((name) => (statSync(join(stateRoot, name)).mode & 0o777) !== 0o600) || (statSync(exported.details.file_path).mode & 0o777) !== 0o600) throw new Error("private DB/WAL/SHM/export mode mismatch");
const purged = await runTool("context_purge", { source_id: sourceId });
if (purged.details?.deleted !== 1) throw new Error("test source cleanup failed");
rmSync(exported.details.file_path, { force: true });
for (const handler of handlers.get("session_shutdown") || []) await handler({}, ctx);
console.log("PASS pi-context capture/search/get/export, redaction, balanced retention, six-tool surface, and 0600 files");
