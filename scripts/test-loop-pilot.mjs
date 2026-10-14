#!/usr/bin/env node
// Offline regression: pure comparisons + real temporary telemetry files; no provider calls.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const root = mkdtempSync(join(tmpdir(), "loop-pilot-test-"));
process.env.PI_CODING_AGENT_DIR = root;
process.env.PI_PROFILE = "0";
process.env.PI_LOOP_RECORD = "1";
try {
  const { default: profiler, createLoopPilot, analyzeLoopPilot, formatLoopPilot } = await import(pathToFileURL(process.argv[2] || join(process.cwd(), "local-extensions/loop-profiler.ts")).href);
  const cwd = join(root, "workspace"); mkdirSync(cwd);
  const scope = { projectHash: createHash("sha256").update(cwd).digest("hex").slice(0, 12), provider: "test", model: "faux", thinking: "medium" };
  const pilot = createLoopPilot(scope, [], "2026-10-01T00:00:00.000Z");
  const fixture = (phase, i, calls = 10, durationMs = 10000) => ({
    ...scope, version: 4, measurementVersion: 1, pilotId: pilot.id, pilotPhase: phase, pilotGuidanceApplied: phase === "grouped",
    runId: `${phase}-${i}`, trackedTaskIds: [`${phase}-${i}`], completedTaskIds: [`${phase}-${i}`],
    timestamp: `2026-10-01T00:${phase === "baseline" ? "01" : "02"}:0${i}.000Z`,
    endedAt: `2026-10-01T00:${phase === "baseline" ? "01" : "02"}:1${i}.000Z`,
    durationMs, modelCalls: calls, codeWriteAttempts: 1, codeMutationCount: 1, timingIncomplete: false,
    checksCoverFinalWrites: true, lastCheckResult: "passed", stopReason: "stop", checkSignatures: ["suite1", "suite2"], checkPasses: 2,
    toolCalls: 5, toolErrors: 0,
  });
  const base = Array.from({ length: 5 }, (_, i) => fixture("baseline", i));
  const group = (calls, ms) => Array.from({ length: 5 }, (_, i) => fixture("grouped", i, calls, ms));
  assert.equal(analyzeLoopPilot(pilot, [...base, ...group(5, 5000)]).signal, "lower calls and time");
  assert.equal(analyzeLoopPilot(pilot, [...base, ...group(10, 10000)]).signal, "no visible change");
  assert.equal(analyzeLoopPilot(pilot, [...base, ...group(20, 20000)]).signal, "higher calls and time");
  assert.equal(analyzeLoopPilot(pilot, [...base, ...group(5, 20000)]).signal, "mixed change");
  assert.equal(analyzeLoopPilot(pilot, [...base, ...group(5, 5000).slice(0, 4)]).signal, "insufficient data");
  assert.equal(analyzeLoopPilot(pilot, [...base, ...group(5, 5000)]).guardrails, true);
  const fewerChecks = group(5, 5000).map((r) => ({ ...r, checkSignatures: ["suite1"] }));
  assert.equal(analyzeLoopPilot(pilot, [...base, ...fewerChecks]).fewerChecks, true);
  assert.equal(analyzeLoopPilot(pilot, [...base, ...fewerChecks]).guardrails, false);
  for (const changed of [
    { timingIncomplete: true }, { model: "other" }, { trackedTaskIds: [] },
    { pilotGuidanceApplied: false }, { checksCoverFinalWrites: false, lastCheckResult: "failed" },
  ]) {
    const rows = group(5, 5000); rows[0] = { ...rows[0], ...changed };
    assert.equal(analyzeLoopPilot(pilot, [...base, ...rows]).guardrails, false);
  }
  const split = group(10, 10000).flatMap((r) => [
    { ...r, runId: `${r.runId}-a`, endedAt: r.timestamp, modelCalls: 4, durationMs: 4000, completedTaskIds: [], checksCoverFinalWrites: false },
    { ...r, runId: `${r.runId}-b`, modelCalls: 6, durationMs: 6000, codeMutationCount: 0, codeWriteAttempts: 0 },
  ]);
  const splitResult = analyzeLoopPilot(pilot, [...base, ...split]);
  assert.equal(splitResult.signal, "no visible change", "Splitting one task across requests must not manufacture improvement");
  assert.equal(splitResult.after.length, 5);
  const repeated = analyzeLoopPilot(pilot, [...base, ...group(5, 5000), base[0]]);
  assert.equal(repeated.before.length, 5, "Duplicate receipt cannot double-count a task");
  const late = { ...base[0], runId: "late", endedAt: "2026-10-01T00:03:00Z", durationMs: 99999, modelCalls: 999 };
  assert.equal(analyzeLoopPilot(pilot, [...base, late]).modelBefore, 10, "Completed baseline task cannot be rewritten by a later continuation");
  assert.match(formatLoopPilot(pilot, [...base, ...group(5, 5000)]), /no causal or answer-quality claim/i);
  assert.match(formatLoopPilot(pilot, [], [base[0]]), /missing receipts 1/);
  assert.match(formatLoopPilot(pilot, Array(100).fill(base[0])), /sample limit reached/);

  const handlers = new Map(), commands = new Map(), notices = [];
  profiler({
    on(name, handler) { const hs = handlers.get(name) ?? []; hs.push(handler); handlers.set(name, hs); },
    registerCommand(name, command) { commands.set(name, command); },
  });
  const ctx = { cwd, model: { provider: scope.provider, id: scope.model }, thinkingLevel: scope.thinking, ui: { notify: (message, kind) => notices.push({ message, kind }) } };
  const emit = async (name, e = {}) => { const results = []; for (const h of handlers.get(name) ?? []) results.push(await h({ type: name, ...e }, ctx)); return results; };
  let next = 0;
  const call = async (toolName, args, text = "ok", isError = false) => {
    const toolCallId = `tool-${++next}`;
    await emit("tool_execution_start", { toolCallId, toolName, args });
    await emit("tool_execution_end", { toolCallId, toolName, result: { content: [{ type: "text", text }] }, isError });
  };
  const turn = async () => { await emit("turn_start", { turnIndex: next }); await emit("before_provider_request", { payload: {} }); };
  const endTurn = () => emit("message_end", { message: { role: "assistant", stopReason: "toolUse", usage: { input: 1, output: 1 } } });
  const begin = async (id) => {
    writeFileSync(join(cwd, "TODO.md"), `# TODO\n\n## In progress\n- [ ] PRIVATE_TASK_TEXT <!-- pi-task:${id} -->\n\n## Pending\n`);
    const result = await emit("before_agent_start", { messageType: "user", prompt: "PRIVATE_PROMPT", systemPrompt: "system", systemPromptOptions: {} });
    await turn(); return result[0];
  };
  const finish = async () => {
    await emit("message_end", { message: { role: "assistant", stopReason: "stop", usage: { input: 1, output: 1 } } });
    await emit("agent_settled");
  };
  const runsPath = join(root, "observability/loop-runs.jsonl");
  const latest = () => JSON.parse(readFileSync(runsPath, "utf8").trim().split("\n").at(-1));
  await commands.get("loop-report").handler("pilot-start", ctx);
  const statePath = join(root, `observability/loop-pilot-${scope.projectHash}.json`);
  const state = JSON.parse(readFileSync(statePath));
  await commands.get("loop-report").handler("pilot-start", ctx);
  assert.equal(JSON.parse(readFileSync(statePath)).id, state.id, "Active pilot cannot silently reset baseline");
  for (let i = 0; i < 5; i++) {
    const id = `baseline${i}`;
    assert.equal(await begin(id), undefined, "Baseline must not receive grouping instruction");
    await call("edit", { path: "/PRIVATE_PATH/file.ts" });
    if (i === 0) { await finish(); await begin(id); } // Same task, second user request.
    else { await endTurn(); await turn(); }
    await call("bash", { command: "set -e\nnode scripts/test-one.mjs\nnode scripts/test-two.mjs" });
    assert.equal(latest()?.pilotPhase ?? "baseline", "baseline");
    await call("task_queue", { action: "complete", id }, `Completed #${id} private task`);
    await finish();
    assert.equal(latest().checksCoverFinalWrites, true);
    assert.equal(latest().checkPasses, 2);
  }
  for (let i = 0; i < 5; i++) {
    const id = `grouped${i}`, guidance = await begin(id);
    assert.match(guidance.message.content, /bounded output/);
    await call("edit", { path: "/PRIVATE_PATH/file.ts" });
    await endTurn(); await turn();
    await call("bash", { command: "node scripts/test-one.mjs && node scripts/test-two.mjs" });
    await call("task_queue", { action: "complete", id }, `Completed #${id} private task`);
    await finish();
    assert.equal(latest().pilotPhase, "grouped");
  }
  const directory = join(root, `observability/loop-pilot-${scope.projectHash}-${state.id}`);
  const receipts = () => readdirSync(directory).filter((f) => f.endsWith(".run.json"));
  assert.equal(receipts().length, 11);
  assert.equal(statSync(statePath).mode & 0o777, 0o600);
  assert.ok(!readFileSync(runsPath, "utf8").includes("PRIVATE_"), "No prompt, path, task text or raw command persisted");
  await commands.get("loop-report").handler("pilot", ctx);
  assert.match(notices.at(-1).message, /baseline 5\/5 tasks · grouped 5\/5 tasks · complete/);
  assert.match(notices.at(-1).message, /missing receipts 0/);
  assert.equal(await begin("later"), undefined);
  await call("edit", { path: "later.ts" }); await finish();
  assert.equal(receipts().length, 11, "Collection must stop after 5+5 tasks");
  await commands.get("loop-report").handler("pilot", ctx);
  assert.match(notices.at(-1).message, /missing receipts 0/, "Intentional stop is not a collection gap");

  // Command detector must not count quoted examples, failure masking or unrelated wrappers as passing checks.
  for (const command of ['echo "npm test"', 'npm test || true', 'npm test | true', 'npm test &', 'node helper.js npm test', 'npm test; echo done']) {
    await begin("detector"); await call("bash", { command }); await finish();
    assert.equal(latest().checkPasses, 0, command);
  }
  // A check started before a code write cannot validate that later write.
  await begin("race");
  await emit("tool_execution_start", { toolCallId: "check", toolName: "bash", args: { command: "npm test" } });
  await call("edit", { path: "race.ts" });
  await emit("tool_execution_end", { toolCallId: "check", toolName: "bash", isError: false, result: { content: [] } });
  await finish(); assert.equal(latest().checksCoverFinalWrites, false);
  // A later code write invalidates a successful check; a report write does not.
  await begin("after-check"); await call("bash", { command: "npm test" }); await call("edit", { path: "changed.ts" }); await finish();
  assert.equal(latest().checksCoverFinalWrites, false);
  await begin("report"); await call("edit", { path: "changed.ts" }); await call("bash", { command: "npm test" }); await call("write", { path: "report.md" }); await finish();
  assert.equal(latest().checksCoverFinalWrites, true);
  // Corrupt receipts fail visibly rather than producing an optimistic summary.
  writeFileSync(join(directory, "corrupt.run.json"), "{}");
  await commands.get("loop-report").handler("pilot", ctx);
  assert.equal(notices.at(-1).kind, "warning"); assert.match(notices.at(-1).message, /Corrupt pilot receipt/);
  console.log("PASS pilot: improved/unchanged/worse/mixed/insufficient; task-level sums prevent split-request gaming; phase transition, cross-turn/run checks, race/masking guards, immutable receipts, stop, privacy and corrupt-state detection. No provider calls.");
} finally { rmSync(root, { recursive: true, force: true }); }
