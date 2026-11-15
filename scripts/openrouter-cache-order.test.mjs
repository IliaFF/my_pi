import assert from "node:assert/strict";
import { BROKEN_TAGS, rankProviders, topCost } from "./openrouter-cache-order.mjs";

const endpoint = (tag, cache, prompt, completion, extra = {}) => ({
  tag,
  status: 0,
  quantization: "fp8",
  max_completion_tokens: 384000,
  pricing: { input_cache_read: cache, prompt, completion },
  ...extra,
});

const rankProviders10 = (endpoints) => rankProviders(endpoints, 10);

const ranked = rankProviders10([
  endpoint("slow/cache-ok", 3e-9, 1e-7, 4e-7),
  endpoint("cheap-cache/high-input", 1e-9, 2e-7, 4e-7),
  endpoint("cheap-cache/low-input", 1e-9, 1e-7, 4e-7),
  endpoint("cheap-cache/low-output", 1e-9, 1e-7, 3e-7),
  endpoint("down/cheapest", 1e-12, 1e-9, 1e-9, { status: -5 }),
  endpoint("fp4/cheapest", 1e-13, 1e-9, 1e-9, { quantization: "fp4" }),
  endpoint("vendor/cheap/flex", 1e-13, 1e-9, 1e-9),
  endpoint("tiny-cap", 1e-13, 1e-9, 1e-9, { max_completion_tokens: 8192 }),
]);

assert.deepEqual(ranked, [
  "cheap-cache/low-output",
  "cheap-cache/low-input",
  "cheap-cache/high-input",
  "slow/cache-ok",
]);
assert.deepEqual(rankProviders([endpoint("only-down", 1e-9, 1e-9, 1e-9, { status: -5 })]), []);
assert.deepEqual(rankProviders([
  endpoint("a", 1e-9, 1e-7, 1e-7),
  endpoint("b", 2e-9, 1e-7, 1e-7),
  endpoint("c", 3e-9, 1e-7, 1e-7),
  endpoint("d", 4e-9, 1e-7, 1e-7),
]), ["a", "b", "c"]);

assert.ok(BROKEN_TAGS.has("stepfun/fp8"));
assert.deepEqual(
  rankProviders([endpoint("stepfun/fp8", 1e-12, 1e-7, 1e-7), endpoint("baidu/fp8", 1e-9, 1e-7, 1e-7)]),
  ["baidu/fp8"],
);
assert.deepEqual(rankProviders([endpoint("big-cap", 1e-9, 1e-7, 1e-7, { max_completion_tokens: 262144 })]), [
  "big-cap",
]);

const valid = endpoint("valid/expensive", 5e-9, 1e-7, 4e-7);
const missing = { tag: "missing/cache", status: 0, quantization: "fp8", max_completion_tokens: 384000, pricing: { prompt: 1e-15, completion: 4e-7 } };
const negative = endpoint("negative/cache", -1e-9, 1e-7, 4e-7);
const nan = endpoint("nan/cache", "abc", 1e-7, 4e-7);
const dirty = [negative, missing, valid, nan];
assert.deepEqual(rankProviders(dirty, 10), ["valid/expensive"]);
assert.throws(() => topCost(dirty, ["negative/cache"]), /valid pricing/);
assert.throws(() => topCost(dirty, ["missing/cache"]), /valid pricing/);

const priced = [
  endpoint("cheap-cache/low-output", 2.094e-9, 9.772e-8, 3.9437e-7),
  endpoint("slow/cache-ok", 3e-9, 1e-7, 4e-7),
];
assert.deepEqual(topCost(priced, rankProviders(priced)), {
  input: 0.09772,
  output: 0.39437,
  cacheRead: 0.002094,
});
console.log("PASS rankProviders: fp8, no tiers, no broken tags, cap >= 65536, finite non-negative prices; cache, then prompt, then completion; top 3");
console.log("PASS topCost: USD per million tokens from the first ranked provider, rejects invalid pricing");
