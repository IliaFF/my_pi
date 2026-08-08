#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const root = resolve(process.argv[2] ?? new URL("..", import.meta.url).pathname);
const source = resolve(root, "local-extensions/auto-ultra-compact/index.ts");
const { analyzeCompactability, authoritativeRecoveryEntries, estimateCompactionTokens, projectAuthoritativeState } = await import(pathToFileURL(source).href);
const text = (length) => [{ type: "text", text: "x".repeat(length) }];
const analyze = (messages) => analyzeCompactability(messages, 24_000);

assert.equal(estimateCompactionTokens({ role: "user", content: text(4001) }), 1001);
assert.equal(analyze([
  { role: "user", content: text(1000) },
  { role: "assistant", content: text(1000) },
]).compactable, false, "small session must not call ctx.compact");
assert.equal(analyze([
  { role: "user", content: text(100_000) },
  { role: "assistant", content: text(1000) },
]).compactable, false, "single indivisible old message has no discardable prefix");
assert.equal(analyze([
  { role: "user", content: text(4000) },
  { role: "assistant", content: text(4000) },
  { role: "user", content: text(100_000) },
]).compactable, true, "older complete turn must be compactable");
assert.equal(analyze([
  { role: "user", content: text(4000) },
  { role: "assistant", content: text(100_000) },
]).compactable, true, "large turn prefix must be compactable");
assert.equal(analyze([
  { role: "compactionSummary", summary: "old summary" },
  { role: "user", content: text(1000) },
]).compactable, false, "previous summary is boundary, not discardable history");

const markerText = [
  "[GOAL] Old goal",
  "[GOAL] Current goal",
  "[CONSTRAINT] Keep selected model",
  "[DECISION] Retired decision",
  "[SUPERSEDED] Retired decision",
  "[DECISION] Active decision",
  "[BLOCKER] Resolved blocker",
  "[RESOLVED] Resolved blocker",
  "[NEXT] Finished step",
  "[COMPLETED] Finished step",
  "[NEXT] Immediate step",
  "[VALIDATION] focused test PASS",
].join("\n");
const preparation = { messagesToSummarize: [{ role: "assistant", content: [{ type: "text", text: markerText }] }] };
const event = { preparation };
const summary = `## Goal
Generated goal

## Constraints & Preferences
- Generated

## Progress
### Done
- [x] Generated

### In Progress
- [ ] Generated

### Blocked
- None

## Key Decisions
- Generated

## Next Steps
1. Generated

## Critical Context
Generated context`;
const entries = authoritativeRecoveryEntries(event);
assert.deepEqual(entries.map(({ marker, value }) => `${marker}:${value}`), [
  "GOAL:Current goal",
  "CONSTRAINT:Keep selected model",
  "DECISION:Active decision",
  "VALIDATION:focused test PASS",
  "NEXT:Immediate step",
]);
const projected = projectAuthoritativeState(summary, event);
for (const value of ["[GOAL] Current goal", "[CONSTRAINT] Keep selected model", "[DECISION] Active decision", "[VALIDATION] focused test PASS", "[NEXT] Immediate step"]) assert.ok(projected.includes(value));
for (const closed of ["Retired decision", "Resolved blocker", "Finished step"]) assert.ok(!projected.includes(closed));
assert.equal(projectAuthoritativeState(projected, event), projected, "projection must be idempotent");
assert.equal((projected.match(/<!-- authoritative-state:start -->/g) ?? []).length, 1);

const compactionSource = readFileSync(resolve(root, "local-extensions/context-compaction.ts"), "utf8");
const projectionAt = compactionSource.indexOf("parsed.summary = projectAuthoritativeState(parsed.summary, { preparation });");
const validationAt = compactionSource.indexOf("const validation = validateSummary(parsed.summary, preparation, entries);");
assert.ok(projectionAt >= 0 && validationAt > projectionAt, "projector must run before strict validation");
assert.equal((compactionSource.match(/const response = await call\(prompt\);/g) ?? []).length, 1, "custom compaction must keep one model call");

console.log("PASS auto-ultra-compact compactability guard and authoritative-state projector");
