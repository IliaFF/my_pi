#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(process.argv[2] ?? new URL("..", import.meta.url).pathname);
const source = resolve(root, "local-extensions/auto-ultra-compact/index.ts");
const autoModule = await import(pathToFileURL(source).href);
const { default: autoUltraCompact, SUMMARY_CONTRACT_ID, analyzeCompactability, authoritativeRecoveryEntries, estimateCompactionTokens, projectAuthoritativeState, validateProjectedAuthoritativeState } = autoModule;
const text = (length) => [{ type: "text", text: "x".repeat(length) }];
const analyze = (messages) => analyzeCompactability(messages, 12_000);

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
  "[CONSTRAINT] Reopened constraint",
  "[REVOKED] Reopened constraint",
  "[CONSTRAINT] Reopened constraint",
  "[DECISION] Retired decision",
  "[SUPERSEDED] Retired decision",
  "[DECISION] Active decision",
  "[DECISION] Reopened decision",
  "[SUPERSEDED] Reopened decision",
  "[DECISION] Reopened decision",
  "[BLOCKER] Resolved blocker",
  "[RESOLVED] Resolved blocker",
  "[BLOCKER] Reopened blocker",
  "[RESOLVED] Reopened blocker",
  "[BLOCKER] Reopened blocker",
  "[NEXT] Finished step",
  "[COMPLETED] Finished step",
  "[NEXT] Immediate step",
  "[NEXT] Reopened step",
  "[COMPLETED] Reopened step",
  "[NEXT] Reopened step",
  "[VALIDATION] focused test PASS",
].join("\n");
const preparation = { messagesToSummarize: [{ role: "assistant", content: [{ type: "text", text: markerText }] }] };
const event = { preparation, branchEntries: [{ type: "message", message: { role: "assistant", content: [{ type: "text", text: "[SUPERSEDED] Reopened decision\n[COMPLETED] Reopened step" }] } }] };
const summary = `## Goal
Generated goal

## Constraints & Preferences
- Generated

## Progress
### Done
- [x] Finished step

### In Progress
- [ ] Generated

### Blocked
- None

## Key Decisions
- [DECISION] Model invented state

## Next Steps
1. Generated

## Critical Context
[COMPLETED] Finished step`;
const entries = authoritativeRecoveryEntries(event);
assert.deepEqual(entries.map(({ marker, value }) => `${marker}:${value}`), [
  "GOAL:Current goal",
  "CONSTRAINT:Reopened constraint",
  "CONSTRAINT:Keep selected model",
  "DECISION:Reopened decision",
  "DECISION:Active decision",
  "BLOCKER:Reopened blocker",
  "VALIDATION:focused test PASS",
  "NEXT:Reopened step",
  "NEXT:Immediate step",
]);
const projected = projectAuthoritativeState(summary, event);
for (const value of ["[GOAL] Current goal", "[CONSTRAINT] Reopened constraint", "[CONSTRAINT] Keep selected model", "[DECISION] Reopened decision", "[DECISION] Active decision", "[BLOCKER] Reopened blocker", "[VALIDATION] focused test PASS", "[NEXT] Reopened step", "[NEXT] Immediate step"]) assert.ok(projected.includes(value));
for (const closedMarker of ["[DECISION] Retired decision", "[BLOCKER] Resolved blocker", "[NEXT] Finished step", "[COMPLETED] Finished step"]) assert.ok(!projected.includes(closedMarker));
assert.ok(projected.includes("- [x] Finished step"), "closed work must remain valid Done prose");
assert.ok(!projected.includes("Model invented state"), "model-generated marker lines must be removed");
assert.deepEqual(validateProjectedAuthoritativeState(projected, event), []);
assert.ok(validateProjectedAuthoritativeState(projected.replace("<!-- authoritative-state:end -->", "[DECISION] Injected state\n<!-- authoritative-state:end -->"), event).length > 0);
assert.ok(validateProjectedAuthoritativeState(`${projected}\n[NEXT] Outside marker`, event).length > 0);
assert.equal(projectAuthoritativeState(projected, event), projected, "projection must be idempotent");
assert.equal((projected.match(/<!-- authoritative-state:start -->/g) ?? []).length, 1);

const compactionSource = readFileSync(resolve(root, "local-extensions/context-compaction.ts"), "utf8");
const projectionAt = compactionSource.indexOf("parsed.summary = projectAuthoritativeState(parsed.summary, { preparation, branchEntries: entries });");
const validationAt = compactionSource.indexOf("const validation = validateSummary(parsed.summary, preparation, entries);");
assert.ok(projectionAt >= 0 && validationAt > projectionAt, "projector must run before strict validation");
assert.equal((compactionSource.match(/const response = await call\(prompt\);/g) ?? []).length, 1, "custom compaction must keep one model call");


async function createContinuationHarness(home) {
  const handlers = new Map();
  const sent = [];
  let compactOptions;
  let compactionLocked = false;
  let contextTokens = 150_000;
  let compactCalls = 0;
  const api = {
    on(name, handler) {
      const list = handlers.get(name) ?? [];
      list.push(handler);
      handlers.set(name, list);
    },
    registerCommand() {},
    registerTool() {},
    sendUserMessage(message, options) {
      if (compactionLocked) throw new Error("Cannot submit a prompt while compaction is in progress. Wait for compaction to finish and retry.");
      sent.push({ message, options });
    },
  };
  autoUltraCompact(api);
  const compactableMessages = [
    { role: "user", content: text(4000) },
    { role: "assistant", content: text(4000) },
    { role: "user", content: text(100_000) },
  ];
  const ctx = {
    cwd: home,
    hasUI: false,
    model: { contextWindow: 200_000, provider: "test", id: "model" },
    getContextUsage: () => ({ tokens: contextTokens }),
    compact(options) { compactOptions = options; compactCalls++; compactionLocked = true; },
    sessionManager: {
      getBranch: () => [],
      buildSessionContext: () => ({ messages: compactableMessages }),
    },
    ui: { notify() {} },
  };
  const emit = async (name, event = {}) => {
    for (const handler of handlers.get(name) ?? []) await handler(event, ctx);
  };
  const completeCompaction = () => {
    assert.ok(compactOptions, "extension threshold must call ctx.compact");
    compactionLocked = false;
    compactOptions.onComplete?.({});
  };
  return { emit, sent, completeCompaction, compactCalls: () => compactCalls, setContextTokens: (tokens) => { contextTokens = tokens; } };
}

const oldHome = process.env.HOME;
const testHome = mkdtempSync(join(tmpdir(), "pi-compaction-followup-"));
process.env.HOME = testHome;
try {
  const automatic = await createContinuationHarness(testHome);
  const preparation = { tokensBefore: 150_000, firstKeptEntryId: "kept", messagesToSummarize: [] };
  await automatic.emit("turn_end");
  await automatic.emit("session_before_compact", { reason: "manual", preparation, branchEntries: [] });
  await automatic.emit("session_compact", { reason: "manual", compactionEntry: { details: { contract: SUMMARY_CONTRACT_ID, validator: "passed" } } });
  assert.equal(automatic.sent.length, 0, "extension continuation must wait until Pi unlocks manual compaction");
  automatic.completeCompaction();
  assert.equal(automatic.sent.length, 1, "extension auto-compaction must enqueue exactly one continuation after onComplete");
  assert.deepEqual(automatic.sent[0].options, { deliverAs: "followUp" });
  assert.match(automatic.sent[0].message, /^Продолжай после автосжатия по validated compact summary/);
  automatic.setContextTokens(155_000);
  await automatic.emit("turn_end");
  assert.equal(automatic.compactCalls(), 2, "ineffective compaction must bypass cooldown and compact again after first real post-compaction usage");

  const reduced = await createContinuationHarness(testHome);
  await reduced.emit("turn_end");
  await reduced.emit("session_before_compact", { reason: "manual", preparation, branchEntries: [] });
  await reduced.emit("session_compact", { reason: "manual", compactionEntry: { details: { contract: SUMMARY_CONTRACT_ID, validator: "passed" } } });
  reduced.completeCompaction();
  reduced.setContextTokens(60_000);
  await reduced.emit("turn_end");
  assert.equal(reduced.compactCalls(), 1, "effective compaction must consume post-check without another compaction");

  const managedSettings = JSON.parse(readFileSync(resolve(root, "configs/settings.json"), "utf8"));
  assert.equal(managedSettings.compaction.keepRecentTokens, 12_000, "managed Pi compaction must retain only 12k estimated tokens");

  const builtin = await createContinuationHarness(testHome);
  await builtin.emit("session_before_compact", { reason: "threshold", preparation, branchEntries: [] });
  await builtin.emit("session_compact", { reason: "threshold", compactionEntry: { details: { contract: SUMMARY_CONTRACT_ID, validator: "passed" } } });
  assert.equal(builtin.sent.length, 1, "built-in threshold compaction must still enqueue continuation during its lifecycle");

  const manual = await createContinuationHarness(testHome);
  await manual.emit("session_before_compact", { reason: "manual", preparation, branchEntries: [] });
  await manual.emit("session_compact", { reason: "manual", compactionEntry: { details: { contract: SUMMARY_CONTRACT_ID, validator: "passed" } } });
  assert.equal(manual.sent.length, 0, "manual /compact must remain idle");
} finally {
  if (oldHome === undefined) delete process.env.HOME;
  else process.env.HOME = oldHome;
  rmSync(testHome, { recursive: true, force: true });
}

console.log("PASS auto-ultra-compact 12k retention, post-compaction verification, compactability, authoritative-state projector, and continuation lifecycle");
