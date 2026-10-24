#!/usr/bin/env node
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire, findPackageJSON } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const modules = resolve(process.argv[2]);
const source = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = mkdtempSync(join(tmpdir(), "pi-deferred-tools-"));
const isolatedKeys = ["HOME", "PI_CODING_AGENT_DIR", "PI_MARKDOWN_PREVIEW_REGISTER_EXPORT_TOOL", "HERDR_ENV", "HERDR_SOCKET_PATH", "HERDR_PANE_ID", "PI_SUBAGENT_ID", "PI_SUBAGENT_AGENT", "PI_DENY_TOOLS"];
const saved = Object.fromEntries(isolatedKeys.map(k => [k, process.env[k]]));
for (const key of isolatedKeys.slice(3)) delete process.env[key];
const previousFetch = globalThis.fetch;
let networkAttempts = 0;
const sessions = [];
process.env.HOME = join(sandbox, "home");
process.env.PI_CODING_AGENT_DIR = join(sandbox, "agent");
process.env.PI_MARKDOWN_PREVIEW_REGISTER_EXPORT_TOOL = "1";
mkdirSync(process.env.HOME); mkdirSync(process.env.PI_CODING_AGENT_DIR);
globalThis.fetch = async () => { networkAttempts++; throw new Error("Network forbidden"); };
try {
  const core = join(modules, "@earendil-works/pi-coding-agent/dist/index.js");
  const require = createRequire(core);
  const { createAgentSession, createCodemodeExtension, createToolSearchExtension, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } = await import(pathToFileURL(core));
  const ai = dirname(findPackageJSON("@earendil-works/pi-ai", pathToFileURL(core)));
  const { fauxProvider, fauxAssistantMessage, fauxToolCall, InMemoryCredentialStore } = await import(pathToFileURL(join(ai, "dist/index.js")));
  const { stream } = await import(pathToFileURL(join(ai, "dist/api/openai-codex-responses.js")));
  const { resolveTranscriptTools } = await import(pathToFileURL(join(ai, "dist/utils/transcript.js")));
  const { createJiti } = await import(pathToFileURL(join(dirname(core), "core/extensions/jiti-loader.js")));
  const jiti = createJiti(import.meta.url, { alias: { "@earendil-works/pi-coding-agent": core, "@sinclair/typebox": require.resolve("typebox"), "@earendil-works/pi-tui": require.resolve("@earendil-works/pi-tui") } });
  const remote = await jiti.import(join(modules, "pi-ssh-remote/index.ts"), { default: true });
  const preview = await jiti.import(join(modules, "pi-markdown-preview/index.ts"), { default: true });
  const context = (await import(pathToFileURL(join(modules, "@spences10/pi-context/dist/tools/index.js")))).register_context_tools;
  const restoreLoadout = await jiti.import(join(source, "local-extensions/deferred-tools.ts"), { default: true });
  const herdr = await jiti.import(join(modules, "pi-herdr-agents/pi-extension/subagents/index.ts"), { default: true });
  const herdrNames = ["worktree_list", "worktree_remove", "subagents_write_task_models", "subagent", "subagent_send", "subagent_stop", "subagent_interrupt", "subagent_cancel", "subagents_list", "subagent_resume"];
  const rare = ["remote", "preview_export", "context_list", "context_stats", "context_purge", ...herdrNames];
  const defaults = JSON.parse(readFileSync(join(source, "configs/settings.json"), "utf8")).defaultTools;
  const runtime = await ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null, refreshOnCreate: false });
  const nativeModel = runtime.getModel("openai-codex", "gpt-6.1-sol"); assert.ok(nativeModel?.compat?.supportsAdditionalTools);
  const provider = fauxProvider({ provider: "offline-deferred", api: "faux", models: [{ id: "fixture", name: "Fixture", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 64000, maxTokens: 1024 }] });
  runtime.registerNativeProvider(provider.provider);
  const model = { ...provider.getModel(), compat: nativeModel.compat };
  const cwd = join(sandbox, "work"); mkdirSync(cwd);
  const errors = [];
  let permissionCalls = 0;
  const forbidLaunch = pi => pi.on("tool_call", event => {
    if (["subagent", "subagent_resume"].includes(event.toolName)) {
      permissionCalls++;
      return { block: true, reason: "Offline launch forbidden" };
    }
  });
  async function open({ legacy = false, baseline = false, manager = SessionManager.inMemory(cwd) } = {}) {
    const settingsManager = SettingsManager.inMemory({ defaultTools: legacy ? ["+codemode"] : defaults, compaction: { enabled: false }, retry: { enabled: false, maxRetries: 0 } });
    // Simulate only old registration exposure; real package executors/schemas and SDK are unchanged.
    const direct = legacy ? rare : baseline ? herdrNames : [];
    const factories = [remote, preview, context, herdr].map(factory => direct.length ? pi => factory({ ...pi, registerTool: definition => pi.registerTool(direct.includes(definition.name) ? { ...definition, exposure: "direct", ...(["subagent", "subagent_resume"].includes(definition.name) ? { promptSnippet: definition.description } : {}) } : definition) }) : factory);
    const loader = new DefaultResourceLoader({ cwd, agentDir: process.env.PI_CODING_AGENT_DIR, settingsManager, noExtensions: true, noSkills: true, noThemes: true, noPromptTemplates: true, appendSystemPrompt: [readFileSync(join(source, "configs/APPEND_SYSTEM.md"), "utf8")], extensionFactories: [createCodemodeExtension({ mode: "on" }), createToolSearchExtension(), ...factories, forbidLaunch, ...(legacy ? [] : [restoreLoadout])] });
    await loader.reload(); assert.deepEqual(loader.getExtensions().errors, []);
    const { session } = await createAgentSession({ cwd, agentDir: process.env.PI_CODING_AGENT_DIR, modelRuntime: runtime, model, thinkingLevel: "off", settingsManager, resourceLoader: loader, sessionManager: manager });
    sessions.push(session); await session.bindExtensions({ onError: e => errors.push(String(e)) }); return session;
  }
  const fresh = await open({ manager: SessionManager.create(cwd, join(sandbox, "fresh-sessions")) });
  for (const name of rare) {
    assert.equal(fresh.getAllTools().find(t => t.name === name)?.exposure, "deferred", `${name} must register deferred`);
    assert.ok(!fresh.getActiveToolNames().includes(name), `${name} leaked into fresh declarations`);
    assert.ok(fresh.getCallableToolNames().includes(name), `${name} must remain callable`);
  }
  assert.ok(fresh.getActiveToolNames().includes("tool_search"), "Native tool_search must be active");
  assert.ok(!fresh.systemPrompt.includes("Authenticated subagent models"));
  for (const rule of ["more than one context window", "folding, recall and compaction", "remaining work", "do not wait for an overflow", "Small scouts and prototypes stay in the parent", "Clarify unclear user intent", "unknown solution may qualify at the same threshold", "parent inspects results, verifies and integrates", "goal, constraints, progress and evidence across context cycles", "does not authorize agent launches", "not a substitute for native sequential task handoff", "alone does not prove multi-window continuity", "never poll", "Do not complete work with required checks outstanding"]) {
    assert.ok(fresh.systemPrompt.includes(rule), `Permanent prompt lost ${rule}`);
  }
  for (const name of ["read", "bash", "write", "edit", "context_search", "context_get", "context_export"]) assert.ok(fresh.getActiveToolNames().includes(name), `${name} must remain direct`);
  const contexts = [];
  const save = ctx => contexts.push(JSON.parse(JSON.stringify(ctx)));
  provider.setResponses([
    ctx => { save(ctx); return fauxAssistantMessage([fauxToolCall("tool_search", { query: "context_stats", limit: 1 })]); },
    ctx => { save(ctx); return fauxAssistantMessage([fauxToolCall("context_stats", {})]); },
    ctx => { save(ctx); return fauxAssistantMessage([fauxToolCall("tool_search", { query: "remote", limit: 1 })]); },
    ctx => { save(ctx); return fauxAssistantMessage([fauxToolCall("remote", { action: "status" })]); },
    ctx => { save(ctx); return fauxAssistantMessage([fauxToolCall("tool_search", { query: "context_list", limit: 1 })]); },
    ctx => { save(ctx); return fauxAssistantMessage([fauxToolCall("context_list", { limit: 1 })]); },
    ctx => { save(ctx); return fauxAssistantMessage("Finished"); },
  ]);
  await fresh.prompt("Discover and call only empty context stats/list and disconnected remote status.");
  assert.equal(contexts.length, 7, "Actual tool calls must finish");
  const results = contexts.at(-1).messages.filter(m => m.role === "toolResult");
  for (const name of ["context_stats", "remote", "context_list"]) assert.ok(results.some(r => r.toolName === name && !r.isError), `${name} real executor failed`);
  assert.deepEqual(fresh.getActiveToolNames().filter(n => rare.includes(n)).sort(), ["context_list", "context_stats", "remote"]);
  const partial = await open({ manager: SessionManager.open(fresh.sessionManager.getSessionFile()) });
  assert.deepEqual(partial.getActiveToolNames().filter(n => rare.includes(n)).sort(), ["context_list", "context_stats", "remote"]);
  assert.ok(partial.getActiveToolNames().includes("tool_search"));
  // Search metadata for render/destructive tools without executing them.
  provider.setResponses([
    () => fauxAssistantMessage([fauxToolCall("tool_search", { query: "preview_export", limit: 1 })]),
    () => fauxAssistantMessage([fauxToolCall("tool_search", { query: "context_purge", limit: 1 })]),
    () => fauxAssistantMessage("Loaded without rendering or purge"),
  ]);
  await fresh.prompt("Load the remaining two definitions, but do not call either executor.");
  const herdrDiscovery = [];
  for (const name of herdrNames) {
    const capture = ctx => { if (name === "subagent") herdrDiscovery.push(JSON.parse(JSON.stringify(ctx))); };
    provider.setResponses([
      ctx => { capture(ctx); return fauxAssistantMessage([fauxToolCall("tool_search", { query: name === "subagent" ? "Spawn dedicated terminal worktree" : name, limit: 1 })]); },
      ctx => { capture(ctx); return fauxAssistantMessage("Loaded without launch or mutation"); },
    ]);
    await fresh.prompt(`Discover ${name} without executing it.`);
    assert.ok(fresh.getActiveToolNames().includes(name), `${name}: native discovery failed: ${JSON.stringify(fresh.messages.filter(m => m.role === "toolResult").at(-1)?.content)}`);
  }
  assert.ok(rare.every(n => fresh.getActiveToolNames().includes(n)));
  assert.match(fresh.systemPrompt, /never poll/);
  assert.match(fresh.systemPrompt, /Authenticated subagent models/);
  assert.ok(!fresh.systemPrompt.includes(fresh.getAllTools().find(t => t.name === "subagent").description), "Tool-list snippet must not repeat the full description");
  for (const name of ["subagent", "subagent_resume"]) {
    assert.match(fresh.getAllTools().find(t => t.name === name).description, /DO NOT write polling/);
  }
  // Exercise a safe real Herdr executor and both native trust-boundary gates, never launch.
  provider.setResponses([
    () => fauxAssistantMessage([fauxToolCall("subagents_list", {})]),
    () => fauxAssistantMessage("Listed"),
  ]);
  await fresh.prompt("List only local agent definitions.");
  assert.ok(fresh.messages.some(m => m.role === "toolResult" && m.toolName === "subagents_list" && !m.isError));
  provider.setResponses([
    () => fauxAssistantMessage([fauxToolCall("subagent", {})]),
    () => fauxAssistantMessage([fauxToolCall("subagent", { name: "fixture-test", task: "Must never launch" })]),
    () => fauxAssistantMessage("Validation and permission refusal complete"),
  ]);
  await fresh.prompt("Exercise refusal only; no child launch.");
  const refusals = fresh.messages.filter(m => m.role === "toolResult" && m.toolName === "subagent");
  assert.equal(refusals.length, 2);
  assert.ok(refusals.every(m => m.isError));
  assert.match(JSON.stringify(refusals[0].content), /valid|require/i);
  assert.match(JSON.stringify(refusals[1].content), /Offline launch forbidden/);
  assert.ok(permissionCalls > 0);
  const fakeToken = ["offline", Buffer.from(JSON.stringify({ "https://api.openai.com/auth": { chatgpt_account_id: "offline-fixture" } })).toString("base64url"), "fixture"].join(".");
  async function payload(ctx, selected = nativeModel) {
    let body;
    const end = await stream(selected, ctx, { apiKey: fakeToken, sessionId: "offline-deferred-stable", transport: "sse", onPayload: p => { body = structuredClone(p); throw new Error("OFFLINE_CAPTURE"); } }).result();
    assert.ok(body); assert.match(end.errorMessage, /OFFLINE_CAPTURE/); return body;
  }
  const herdrBefore = await payload(herdrDiscovery[0]), herdrAfter = await payload(herdrDiscovery[1]);
  assert.equal(herdrBefore.instructions, herdrAfter.instructions);
  assert.equal(herdrBefore.prompt_cache_key, herdrAfter.prompt_cache_key);
  assert.deepEqual(herdrAfter.input.slice(0, herdrBefore.input.length), herdrBefore.input);
  assert.ok(herdrAfter.input.some(m => m.type === "additional_tools" && m.tools.some(t => t.name === "subagent")));
  assert.ok(JSON.stringify(herdrDiscovery[1].messages).includes("Authenticated subagent models"), "Discovery must deliver the refreshed catalog to the provider");
  const initial = await payload(contexts[0]), loaded = await payload(contexts[1]);
  assert.equal(initial.tools, undefined, "Native changes mode declares initial tools in history");
  const initialTools = initial.input.find(m => m.type === "additional_tools")?.tools;
  assert.ok(initialTools?.some(t => t.name === "tool_search"));
  assert.ok(rare.every(name => !initialTools.some(t => t.name === name)));
  assert.deepEqual(loaded.tools, initial.tools); assert.equal(loaded.instructions, initial.instructions); assert.equal(loaded.prompt_cache_key, initial.prompt_cache_key);
  assert.deepEqual(loaded.input.slice(0, initial.input.length), initial.input);
  assert.ok(loaded.input.some(m => m.type === "additional_tools" && m.tools.some(t => t.name === "context_stats")));
  const fallback = await payload(contexts[1], { ...nativeModel, compat: { ...nativeModel.compat, supportsAdditionalTools: false, supportsToolSearch: true } });
  assert.deepEqual(fallback.tools, initialTools); assert.ok(fallback.input.some(m => m.type === "tool_search_output" && m.tools.some(t => t.name === "context_stats" && t.defer_loading)));
  const unsupported = await payload(contexts[1], { ...nativeModel, compat: { ...nativeModel.compat, supportsAdditionalTools: false, supportsToolSearch: false } });
  assert.ok(unsupported.tools.some(t => t.name === "context_stats"));
  assert.equal(resolveTranscriptTools(contexts[1].messages, "changes").foldedSystemMessages, 0);

  // The actual pre-change source already deferred five tools and enabled search.
  const baseline = await open({ baseline: true, manager: SessionManager.create(cwd, join(sandbox, "baseline-sessions")) });
  let baselineContext;
  provider.setResponses([ctx => { baselineContext = JSON.parse(JSON.stringify(ctx)); return fauxAssistantMessage("Recorded source baseline"); }]);
  await baseline.prompt("Capture the pre-change source loadout without executing tools.");
  const baselineBody = await payload(baselineContext);
  const baselineTools = baselineBody.input.find(m => m.type === "additional_tools").tools;
  const baselineResumed = await open({ manager: SessionManager.open(baseline.sessionManager.getSessionFile()) });
  assert.ok(herdrNames.every(n => baselineResumed.getActiveToolNames().includes(n)));
  assert.ok(baselineResumed.getActiveToolNames().includes("tool_search"));
  let baselineResumedContext;
  provider.setResponses([ctx => { baselineResumedContext = JSON.parse(JSON.stringify(ctx)); return fauxAssistantMessage("Source baseline resumed"); }]);
  await baselineResumed.prompt("Continue the recorded source baseline.");
  assert.deepEqual((await payload(baselineResumedContext)).input.slice(0, baselineBody.input.length), baselineBody.input);

  // Persist a real pre-change-style SDK transcript and reopen under the new defaults/exposure.
  const legacy = await open({ legacy: true, manager: SessionManager.create(cwd, join(sandbox, "sessions")) });
  let legacyContext;
  provider.setResponses([ctx => { legacyContext = JSON.parse(JSON.stringify(ctx)); return fauxAssistantMessage("Recorded legacy"); }]);
  await legacy.prompt("Record legacy tools.");
  const file = legacy.sessionManager.getSessionFile(); assert.ok(file && existsSync(file));
  const legacyBody = await payload(legacyContext);
  const legacyTools = legacyBody.input.find(m => m.type === "additional_tools")?.tools;
  assert.ok(legacyTools?.length);
  assert.ok(rare.every(n => legacyTools.some(t => t.name === n)));
  assert.ok(!legacy.getActiveToolNames().includes("tool_search"));
  const unchangedFile = join(sandbox, "legacy-unchanged.jsonl"); copyFileSync(file, unchangedFile);
  const unchanged = await open({ manager: SessionManager.open(unchangedFile) });
  assert.ok(rare.every(n => unchanged.getActiveToolNames().includes(n)));
  assert.ok(!unchanged.getActiveToolNames().includes("tool_search"));
  let unchangedContext;
  provider.setResponses([ctx => { unchangedContext = JSON.parse(JSON.stringify(ctx)); return fauxAssistantMessage("Unchanged legacy"); }]);
  await unchanged.prompt("Continue the untouched legacy branch.");
  const unchangedBody = await payload(unchangedContext);
  assert.deepEqual(unchangedBody.tools, legacyBody.tools); assert.equal(unchangedBody.instructions, legacyBody.instructions);
  assert.deepEqual(unchangedBody.input.slice(0, legacyBody.input.length), legacyBody.input);
  assert.equal(resolveTranscriptTools(unchangedContext.messages, "changes").foldedSystemMessages, 0);
  legacy.setActiveToolsByName(legacy.getActiveToolNames().filter(n => !["context_stats", "subagent_resume"].includes(n)));
  let removedContext;
  provider.setResponses([ctx => { removedContext = JSON.parse(JSON.stringify(ctx)); return fauxAssistantMessage("Keep stats removed"); }]);
  await legacy.prompt("Record a previously removed tool.");
  const removedBody = await payload(removedContext);
  legacy.dispose();
  const resumed = await open({ manager: SessionManager.open(file) });
  assert.ok(rare.filter(n => !["context_stats", "subagent_resume"].includes(n)).every(n => resumed.getActiveToolNames().includes(n)), "Resume must retain already declared rare tools");
  for (const name of ["context_stats", "subagent_resume"]) assert.ok(!resumed.getActiveToolNames().includes(name), "Do not resurrect a recorded removal");
  assert.ok(!resumed.getActiveToolNames().includes("tool_search"), "Do not inject a new loader into recorded sessions");
  let resumedContext;
  provider.setResponses([ctx => { resumedContext = JSON.parse(JSON.stringify(ctx)); return fauxAssistantMessage("Resumed"); }]);
  await resumed.prompt("Continue without rewriting tools.");
  const resumedBody = await payload(resumedContext);
  assert.deepEqual(resumedBody.tools, removedBody.tools); assert.equal(resumedBody.instructions, removedBody.instructions);
  assert.deepEqual(resumedBody.input.slice(0, removedBody.input.length), removedBody.input);
  assert.equal(resolveTranscriptTools(resumedContext.messages, "changes").foldedSystemMessages, 0);
  assert.ok(removedBody.input.some(m => m.role === "developer" && String(m.content).includes("context_stats") && String(m.content).includes("no longer available")));
  const promptSize = ctx => {
    const sections = Object.assign({}, ...ctx.messages.filter(m => m.role === "system").map(m => m.sections ?? {}));
    return Object.fromEntries(Object.entries(sections).map(([key, value]) => {
      const text = value.replaceAll(cwd, "/fixture/work").replaceAll(process.env.PI_CODING_AGENT_DIR, "/fixture/agent");
      return [key, { chars: text.length, bytes: Buffer.byteLength(text) }];
    }));
  };
  const oldBytes = Buffer.byteLength(JSON.stringify(legacyTools)), freshBytes = Buffer.byteLength(JSON.stringify(initialTools));
  assert.ok(freshBytes < oldBytes, "Fresh schemas including search overhead must be smaller");
  const nameDiff = (a, b) => a.filter(t => !b.some(x => x.name === t.name)).map(t => t.name).sort();
  assert.deepEqual(nameDiff(legacyTools, initialTools), [...rare].sort());
  assert.deepEqual(nameDiff(initialTools, legacyTools), ["tool_search"]);
  assert.deepEqual(nameDiff(baselineTools, initialTools), [...herdrNames].sort());
  assert.deepEqual(nameDiff(initialTools, baselineTools), []);
  const baselineBytes = Buffer.byteLength(JSON.stringify(baselineTools));
  assert.ok(freshBytes < baselineBytes);
  assert.deepEqual(errors, []); assert.equal(networkAttempts, 0);
  console.log(JSON.stringify({ passed: true, initialSchemaBytes: freshBytes, legacySchemaBytes: oldBytes, savedBytes: oldBytes - freshBytes, removedInitial: rare, addedInitial: ["tool_search"], scope: "Actual remote/preview/context/Herdr SDK fixture; empty credentials, no skills/MCP; bytes not tokens or full personal runtime", sourceBaselineSchemaBytes: baselineBytes, sourceSavedSchemaBytes: baselineBytes - freshBytes, sourceRemovedInitial: herdrNames, sourceBaselinePromptSections: promptSize(baselineContext), candidatePromptSections: promptSize(contexts[0]), sameCandidateAppendInBoth: true, nativeDiscovery: true, safeExecutors: ["context_stats", "remote status", "context_list", "subagents_list"], permissionAndValidationRefusals: true, resumedPrefixStable: true, additivePayloadStable: true, networkAttempts, limitations: "No real cache hits/TTL, live endpoint, SSH connect, rendering/purge, latency or quality measured" }));
} finally {
  for (const session of sessions) session.dispose();
  globalThis.fetch = previousFetch;
  for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  rmSync(sandbox, { recursive: true, force: true });
}

// Keep the actual web activation regression in the same native discovery gate.
await import("./test-web-loader-sdk.mjs");
