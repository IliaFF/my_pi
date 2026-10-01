#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

// Read-only comparison; output contains timings/sizes, never matched source text.
const cwd = resolve(process.argv[2]), agent = resolve(process.argv[3]);
const modules = join(agent, "npm/node_modules");
const core = join(modules, "@earendil-works/pi-coding-agent/dist");
const require = createRequire(join(core, "index.js"));
const { createJiti } = await import(pathToFileURL(join(core, "core/extensions/jiti-loader.js")));
const { createFindToolDefinition } = await import(pathToFileURL(join(core, "core/tools/find.js")));
const { createGrepToolDefinition } = await import(pathToFileURL(join(core, "core/tools/grep.js")));
const state = mkdtempSync(join(tmpdir(), "pi-search-compare-"));
process.env.PI_CODING_AGENT_DIR = state;
process.env.FFF_FRECENCY_DB = join(state, "frecency");
process.env.FFF_HISTORY_DB = join(state, "history");
const handlers = new Map(), tools = new Map();
let active = ["read", "grep", "find", "edit", "write", "bash"];
const pi = {
  on(name, fn) { const list = handlers.get(name) || []; list.push(fn); handlers.set(name, list); },
  registerTool(t) { tools.set(t.name, t); }, registerFlag() {}, registerCommand() {},
  getFlag(name) { return name === "fff-mode" ? "override" : undefined; },
  getActiveTools() { return active; }, setActiveTools(names) { active = names; },
};
const ctx = { cwd, hasUI: false, ui: { notify(message, type) { if (type === "error") throw new Error(message); }, setStatus() {}, setAutocompleteProvider() {} } };
const start = performance.now();
const jiti = createJiti(import.meta.url, { alias: { "@sinclair/typebox": require.resolve("typebox") } });
(await jiti.import(join(modules, "@ff-labs/pi-fff/src/index.ts"), { default: true }))(pi);
try {
  for (const fn of handlers.get("session_start") || []) await fn({}, ctx);
  console.log("fff startup+index ms", (performance.now() - start).toFixed(1));
  const text = r => r.content.filter(c => c.type === "text").map(c => c.text).join("\n");
  const cases = [
    ["find ts", createFindToolDefinition(cwd), tools.get("find"), { pattern: "*.ts", limit: 30 }, { pattern: "", path: "**/*.ts", limit: 30 }],
    ["grep imports", createGrepToolDefinition(cwd), tools.get("grep"), { pattern: "import", literal: true, glob: "*.ts", limit: 20 }, { pattern: "import", path: "*.ts", caseSensitive: true, limit: 20 }],
  ];
  for (const [label, native, fff, a, b] of cases) {
    assert.ok(fff);
    const results = {};
    for (const [name, tool, params] of [["native", native, a], ["fff", fff, b]]) {
      const times = []; let output;
      for (let i = 0; i < 7; i++) {
        const t = performance.now(); output = text(await tool.execute("bench", params, undefined, undefined, ctx)); times.push(performance.now() - t);
      }
      times.sort((a, b) => a - b);
      assert.ok(!output.startsWith("No matches found") && !output.startsWith("No files found"), label);
      results[name] = { median_ms: +times[3].toFixed(2), output_chars: output.length };
    }
    console.log(JSON.stringify({ label, ...results }));
  }
  if (existsSync(join(cwd, "npm/package-lock.json"))) {
    const fuzzy = text(await tools.get("find").execute("fuzzy", { pattern: "packlock", limit: 5 }, undefined, undefined, ctx));
    assert.ok(fuzzy.includes("package-lock.json"));
    console.log("PASS fuzzy packlock resolves package-lock.json");
  }
} finally {
  for (const fn of handlers.get("session_shutdown") || []) await fn({}, ctx);
  rmSync(state, { recursive: true, force: true });
}
