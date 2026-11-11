// Verifies the installed context-fold patch: fold thresholds, step and gauge follow the effective
// 170k window (the auto-compaction cap), while the ladder budget stays the provider-window ceiling.
// Also pins the regression that made every turn an emergency fold: a 160k session must not fold
// mere 5k of fresh maskable content, because the budget is 200k, not 0.75 × 170k.
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const agentDir = resolve(process.argv[2] || process.env.PI_CODING_AGENT_DIR || join(process.env.HOME, ".pi/agent"));
const modules = join(agentDir, "npm/node_modules");
const { createJiti } = await import(pathToFileURL(join(modules, "@earendil-works/pi-coding-agent/dist/core/extensions/jiti-loader.js")).href);
const jiti = createJiti(import.meta.url);
const { ContextFoldEngine } = await jiti.import(join(modules, "context-fold/src/adapters/pi/store.ts"));
const { FoldLadderPolicy, LADDER_DEFAULTS } = await jiti.import(join(modules, "context-fold/src/core/policy/fold-ladder.ts"));

const toolResult = (i, chars) => ({
  role: "toolResult", toolCallId: `call-${i}`, toolName: "bash",
  content: [{ type: "text", text: "x".repeat(chars) }], timestamp: 2 + i,
});
const isFolded = (messages) => JSON.stringify(messages).includes("FOLDED");
const freshEngine = () => new ContextFoldEngine(new FoldLadderPolicy(LADDER_DEFAULTS));
const base = () => [
  { role: "user", content: "Implement the fold window change.", timestamp: 0 },
  { role: "assistant", content: [{ type: "text", text: "Reading the ladder policy." }], timestamp: 1 },
  ...[0, 1, 2, 3, 4, 5].map(i => toolResult(i, 20_000)),
  // An assistant turn after the results: results delivered in the current turn are held (the
  // provider has not seen them yet) and never maskable.
  { role: "assistant", content: [{ type: "text", text: "Outputs read." }], timestamp: 8 },
  { role: "user", content: "T".repeat(100_000), timestamp: 9 },
];
// Two unprotected 5k tool results (~10k maskable, below the 20.4k step) behind a protected tail.
const policyView = (budget, reportedTokens) => ({
  blocks: [
    { id: "r:a", kind: "tool_result", tokens: 5_000, foldedTokens: 30, held: false, frozen: false, protected: false },
    { id: "r:b", kind: "tool_result", tokens: 5_000, foldedTokens: 30, held: false, frozen: false, protected: false },
    { id: "u:1", kind: "user", tokens: 20_000, foldedTokens: 20_000, held: false, frozen: false, protected: true },
  ],
  budget,
  contextWindow: 170_000,
  liveTokens: reportedTokens,
  reportedTokens,
  reportedBudget: budget,
});

// A. The frame: thresholds, step and gauge follow the 170k effective window; the budget stays the
// provider-window ceiling, so a session running up to the 170k compaction point never goes "over
// budget" and never falls into the emergency branch that folds on every single turn.
const view = freshEngine().viewFor(base(), { tokens: 80_000, contextWindow: 1_048_576 });
assert.equal(view.contextWindow, 170_000, "fold thresholds must use the 170k effective window");
assert.equal(view.budget, 200_000, "ladder budget must stay the provider-window ceiling");

// B. First fold: 80k tokens is past 45% of 170k with 30k of maskable tool output.
const engine = freshEngine();
const first = engine.process(base(), { tokens: 80_000, contextWindow: 1_048_576 });
assert.ok(isFolded(first), "80k tokens is past 45% of 170k and must fold");
assert.equal(engine.status.metrics.step_tokens, 20_400, "one ladder step is 12% of the 170k window");
assert.equal(engine.status.metrics.usage_fraction, 0.471, "gauge must report usage against the effective window");

// C. Anti-churn regression: at 160k reported tokens ~10k of fresh maskable output is below one
// step, so the ladder must stay quiet. With the budget tied to the capped window (127.5k) this was
// an emergency fold every turn — 29 folds in 12 minutes in the live session, each rewriting the
// cached prefix and producing "folds not on wire" plus a permanent "over budget" footer.
const policy = new FoldLadderPolicy(LADDER_DEFAULTS);
assert.deepEqual(policy.conduct(policyView(view.budget, 160_000)), [], "160k tokens must not fold: below one step and below the 200k ceiling");

// D. The emergency ceiling itself still works: past 200k the eligible blocks fold regardless of step.
assert.ok(policy.conduct(policyView(view.budget, 205_000)).length > 0, "205k tokens is over the 200k ceiling and must fold");

console.log("PASS fold window: effective 170000, budget 200000, step 20400, no emergency churn at 160k, ceiling fold at 205k");
