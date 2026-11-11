// Verifies the installed context-fold patch: fold thresholds, step and budget must follow the
// effective 170k window (auto-compaction cap), not a larger provider window.
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const agentDir = resolve(process.argv[2] || process.env.PI_CODING_AGENT_DIR || join(process.env.HOME, ".pi/agent"));
const modules = join(agentDir, "npm/node_modules");
const { createJiti } = await import(pathToFileURL(join(modules, "@earendil-works/pi-coding-agent/dist/core/extensions/jiti-loader.js")).href);
const jiti = createJiti(import.meta.url);
const { ContextFoldEngine } = await jiti.import(join(modules, "context-fold/src/adapters/pi/store.ts"));
const { FoldLadderPolicy, LADDER_DEFAULTS } = await jiti.import(join(modules, "context-fold/src/core/policy/fold-ladder.ts"));

const messages = [
  { role: "user", content: "Implement the fold window change.", timestamp: 0 },
  { role: "assistant", content: [{ type: "text", text: "Reading the ladder policy." }], timestamp: 1 },
  ...Array.from({ length: 6 }, (_, i) => ({
    role: "toolResult", toolCallId: `call-${i}`, toolName: "bash",
    content: [{ type: "text", text: "x".repeat(20_000) }], timestamp: 2 + i,
  })),
  { role: "assistant", content: [{ type: "text", text: "Outputs read." }], timestamp: 8 },
  { role: "user", content: "T".repeat(100_000), timestamp: 9 },
];
const input = { tokens: 80_000, contextWindow: 1_048_576 };
const engine = new ContextFoldEngine(new FoldLadderPolicy(LADDER_DEFAULTS));
const view = engine.viewFor(messages, input);
assert.equal(view.contextWindow, 170_000, "fold thresholds must use the 170k effective window");
assert.equal(view.budget, 127_500, "ladder budget must scale with the 170k effective window");
assert.ok(JSON.stringify(engine.process(messages, input)).includes("FOLDED"), "80k tokens is past 45% of 170k and must fold");
assert.equal(engine.status.metrics.step_tokens, 20_400, "one ladder step is 12% of the 170k window");
assert.equal(engine.status.metrics.usage_fraction, 0.471, "gauge must report usage against the effective window");
console.log("PASS fold window: 170000 effective, budget 127500, step 20400, masking starts at 45%");
