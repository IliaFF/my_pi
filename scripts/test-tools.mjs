import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.argv[2] ?? new URL("..", import.meta.url).pathname;
const source = await readFile(join(root, "local-extensions/tools.ts"), "utf8");
const contextTools = ["context_search", "context_get", "context_export", "context_list", "context_stats", "context_purge"];
const expectedVisible = ["read", "grep", "find", "edit", "write", "bash", ...contextTools, "ask_user_question", "recall_folded"];
assert.ok(!source.includes("fabric_exec"), "Fabric tool must not remain in direct surface reconciler");
const dir = await mkdtemp(join(tmpdir(), "pi-tools-test-"));
const modulePath = join(dir, "tools.ts");
await writeFile(modulePath, source.replace(/^import .*;\n/gm, ""));
try {
  const { default: toolsExtension } = await import(pathToFileURL(modulePath).href);
  const handlers = new Map();
  let active = ["ask_user_question"];
  const pi = {
    appendEntry() {},
    getActiveTools: () => active,
    getAllTools: () => expectedVisible.map((name) => ({ name })),
    on: (event, handler) => handlers.set(event, handler),
    registerCommand() {},
    setActiveTools: (tools) => { active = tools; },
  };
  toolsExtension(pi);
  await handlers.get("session_compact")({}, { sessionManager: { getBranch: () => [{ type: "compaction", summary: "Use {#abc123 FOLDED}" }] } });
  assert.deepEqual(active, ["read", "grep", "find", "edit", "write", "bash", ...contextTools, "ask_user_question", "recall_folded"]);
  await handlers.get("session_tree")({}, { sessionManager: { getBranch: () => [{ type: "custom", customType: "tools-config", data: { enabledTools: ["ask_user_question"] } }] } });
  assert.deepEqual(active, ["ask_user_question", ...contextTools], "legacy manual selection must migrate searchable context tools once");
  assert.ok(!active.includes("fabric_exec"));
  console.log("PASS direct/searchable tool surface, legacy selection migration, and context-fold recall reconciliation");
} finally {
  await rm(dir, { recursive: true, force: true });
}
