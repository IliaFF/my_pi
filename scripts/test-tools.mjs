import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.argv[2] ?? new URL("..", import.meta.url).pathname;
const source = await readFile(join(root, "local-extensions/tools.ts"), "utf8");
const dir = await mkdtemp(join(tmpdir(), "pi-tools-test-"));
const modulePath = join(dir, "tools.ts");
await writeFile(modulePath, source.replace(/^import .*;\n/gm, ""));
try {
  const { default: toolsExtension } = await import(pathToFileURL(modulePath).href);
  const handlers = new Map();
  let active = ["fabric_exec", "ask_user_question"];
  const pi = {
    appendEntry() {},
    getActiveTools: () => active,
    getAllTools: () => ["fabric_exec", "ask_user_question", "context_recall"].map((name) => ({ name })),
    on: (event, handler) => handlers.set(event, handler),
    registerCommand() {},
    setActiveTools: (tools) => { active = tools; },
  };
  toolsExtension(pi);
  await handlers.get("session_compact")({}, { sessionManager: { getBranch: () => [{ type: "compaction", summary: "Use ctxref://session/item" }] } });
  assert.deepEqual(active, ["fabric_exec", "ask_user_question", "context_recall"]);
  console.log("PASS compaction preserves reconciled tools and adds context_recall");
} finally {
  await rm(dir, { recursive: true, force: true });
}
