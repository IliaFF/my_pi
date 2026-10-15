#!/usr/bin/env node
// Offline integration: real Pi lifecycle and native codemode, faux provider, temporary files only.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { findPackageJSON } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

if (!process.argv[2]) throw new Error("Usage: node scripts/test-loop-profiler-sdk.mjs <Pi SDK package directory> [profiler.ts]");
const sdkDir = resolve(process.argv[2]);
const source = resolve(process.argv[3] || join(dirname(fileURLToPath(import.meta.url)), "../local-extensions/loop-profiler.ts"));
const root = mkdtempSync(join(tmpdir(), "pi-loop-sdk-"));
const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
process.env.PI_CODING_AGENT_DIR = join(root, "agent");
process.env.PI_LOOP_RECORD = "1";
process.env.PI_PROFILE = "0";
const previousFetch = globalThis.fetch;
let networkAttempts = 0;
globalThis.fetch = async () => { networkAttempts++; throw new Error("Network forbidden in profiler test"); };
let session;
try {
  const { createAgentSession, createCodemodeExtension, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } = await import(pathToFileURL(join(sdkDir, "dist/index.js")).href);
  const aiDir = dirname(findPackageJSON("@earendil-works/pi-ai", pathToFileURL(join(sdkDir, "dist/index.js"))));
  const { fauxProvider, fauxAssistantMessage, fauxToolCall, InMemoryCredentialStore } = await import(pathToFileURL(join(aiDir, "dist/index.js")).href);
  const { default: profiler, createLoopPilot, saveLoopPilot } = await import(pathToFileURL(source).href);
  const cwd = join(root, "workspace"), agentDir = process.env.PI_CODING_AGENT_DIR;
  mkdirSync(cwd); mkdirSync(agentDir);
  const secret = "PRIVATE_FIXTURE_MUST_NOT_ENTER_PROFILER_LOGS";
  writeFileSync(join(cwd, "fixture.txt"), secret);
  const provider = fauxProvider({ provider: "loop-profiler-test", api: "faux", models: [{
    id: "faux", name: "Offline test", reasoning: false, input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 32000, maxTokens: 1024,
  }] });
  const modelRuntime = await ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null, refreshOnCreate: false });
  modelRuntime.registerNativeProvider(provider.provider);
  const settingsManager = SettingsManager.inMemory({
    compaction: { enabled: false }, retry: { enabled: false, maxRetries: 0 }, defaultTools: ["read", "codemode"],
  });
  const loader = new DefaultResourceLoader({
    cwd, agentDir, settingsManager, noSkills: true, noThemes: true, noPromptTemplates: true,
    systemPrompt: "Offline test. Use tools when requested.",
    extensionFactories: [profiler, createCodemodeExtension({ mode: "on" })],
  });
  await loader.reload();
  assert.deepEqual(loader.getExtensions().errors, []);
  ({ session } = await createAgentSession({
    cwd, agentDir, modelRuntime, model: provider.getModel(), thinkingLevel: "off", settingsManager,
    resourceLoader: loader, sessionManager: SessionManager.inMemory(cwd), tools: ["read", "codemode"],
  }));
  const errors = [];
  await session.bindExtensions({ onError: (error) => errors.push(error) });
  provider.setResponses([
    fauxAssistantMessage([fauxToolCall("codemode", { code: 'text(await tools.read({ path: "fixture.txt", offset: 1, limit: 10 }));' })]),
    fauxAssistantMessage("Finished"),
    fauxAssistantMessage("Custom run finished"),
  ]);
  await session.prompt("Read fixture via codemode");
  const readRuns = () => readFileSync(join(agentDir, "observability/loop-runs.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  const user = readRuns().at(-1);
  assert.equal(user.trigger, "user");
  assert.equal(user.toolCalls, 2);
  assert.equal(user.directToolCalls, 1);
  assert.equal(user.nestedToolCalls, 1);
  assert.equal(user.outerTools.codemode, 1);
  assert.equal(user.tools.read, 1);
  assert.equal(user.toolErrors, 0);
  assert.equal(user.timingIncomplete, false);
  assert.equal(user.stopReason, "stop");
  assert.ok(user.modelPhaseMs >= 0 && user.activeToolMs >= 0);
  await session.sendCustomMessage({ customType: "profiler-test", content: secret, display: false }, { triggerTurn: true });
  await session.waitForIdle();
  const runs = readRuns();
  assert.equal(runs.length, 2);
  assert.equal(runs[1].trigger, "custom");
  assert.equal(runs[1].promptChars, 0);
  assert.equal(runs[1].stopReason, "stop");
  assert.deepEqual(errors, []);
  assert.ok(!JSON.stringify(runs).includes(secret));
  const pilot = createLoopPilot({ projectHash: user.projectHash, provider: user.provider, model: user.model, thinking: user.thinking });
  saveLoopPilot(pilot);
  const pilotDir = join(agentDir, `observability/loop-pilot-${pilot.scope.projectHash}-${pilot.id}`);
  for (let i = 0; i < 5; i++) {
    const id = `baseline${i}`;
    writeFileSync(join(pilotDir, `${id}.run.json`), JSON.stringify({
      ...user, pilotId: pilot.id, pilotPhase: "baseline", measurementVersion: 1,
      runId: id, timestamp: pilot.startedAt, endedAt: pilot.startedAt, codeWriteAttempts: 1,
      trackedTaskIds: [id], completedTaskIds: [id], checksCoverFinalWrites: true,
    }));
  }
  provider.setResponses([(context) => {
    assert.ok(JSON.stringify(context).includes("Grouping pilot active."), "Pilot instruction must reach real provider context");
    return fauxAssistantMessage("Grouped run finished");
  }]);
  await session.prompt("Check grouped phase");
  const grouped = readRuns().at(-1);
  assert.equal(grouped.pilotPhase, "grouped");
  assert.equal(grouped.pilotGuidanceApplied, true);
  const snapshotPath = join(pilotDir, 'baseline.json'), snapshot = readFileSync(snapshotPath, 'utf8');
  assert.equal(JSON.parse(snapshot).length, 5);
  assert.equal(statSync(snapshotPath).mode & 0o777, 0o600);
  assert.ok(!snapshot.includes(secret));
  const callsBeforeCommand = provider.state.callCount;
  await session.prompt('/loop-report pilot');
  assert.equal(provider.state.callCount, callsBeforeCommand, 'Pilot commands must not call a provider');
  assert.equal(readFileSync(snapshotPath, 'utf8'), snapshot, 'Repeated native commands cannot replace the baseline');
  assert.deepEqual(errors, []);
  assert.equal(networkAttempts, 0);
  console.log(`PASS Pi ${JSON.parse(readFileSync(join(sdkDir, "package.json"))).version}: real user/custom runs, native codemode nesting, phase-specific pilot injection, timings, privacy; 0 network attempts`);
} finally {
  session?.dispose();
  globalThis.fetch = previousFetch;
  if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
  else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
  rmSync(root, { recursive: true, force: true });
}
