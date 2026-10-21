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
const saved = Object.fromEntries(["HOME", "PI_CODING_AGENT_DIR", "PI_MARKDOWN_PREVIEW_REGISTER_EXPORT_TOOL"].map(k => [k, process.env[k]]));
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
  const rare = ["remote", "preview_export", "context_list", "context_stats", "context_purge"];
  const defaults = JSON.parse(readFileSync(join(source, "configs/settings.json"), "utf8")).defaultTools;
  const runtime = await ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null, refreshOnCreate: false });
  const nativeModel = runtime.getModel("openai-codex", "gpt-6.1-sol"); assert.ok(nativeModel?.compat?.supportsAdditionalTools);
  const provider = fauxProvider({ provider: "offline-deferred", api: "faux", models: [{ id: "fixture", name: "Fixture", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 64000, maxTokens: 1024 }] });
  runtime.registerNativeProvider(provider.provider);
  const model = { ...provider.getModel(), compat: nativeModel.compat };
  const cwd = join(sandbox, "work"); mkdirSync(cwd);
  const errors = [];
  async function open({ legacy = false, manager = SessionManager.inMemory(cwd) } = {}) {
    const settingsManager = SettingsManager.inMemory({ defaultTools: legacy ? ["+codemode"] : defaults, compaction: { enabled: false }, retry: { enabled: false, maxRetries: 0 } });
    // Simulate only old registration exposure; real package executors/schemas and SDK are unchanged.
    const factories = [remote, preview, context].map(factory => legacy ? pi => factory({ ...pi, registerTool: definition => pi.registerTool(rare.includes(definition.name) ? { ...definition, exposure: "direct" } : definition) }) : factory);
    const loader = new DefaultResourceLoader({ cwd, agentDir: process.env.PI_CODING_AGENT_DIR, settingsManager, noExtensions: true, noSkills: true, noThemes: true, noPromptTemplates: true, systemPrompt: "Offline deferred regression.", extensionFactories: [createCodemodeExtension({ mode: "on" }), createToolSearchExtension(), ...factories, ...(legacy ? [] : [restoreLoadout])] });
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
  assert.ok(rare.every(n => fresh.getActiveToolNames().includes(n)));
  const fakeToken = ["offline", Buffer.from(JSON.stringify({ "https://api.openai.com/auth": { chatgpt_account_id: "offline-fixture" } })).toString("base64url"), "fixture"].join(".");
  async function payload(ctx, selected = nativeModel) {
    let body;
    const end = await stream(selected, ctx, { apiKey: fakeToken, sessionId: "offline-deferred-stable", transport: "sse", onPayload: p => { body = structuredClone(p); throw new Error("OFFLINE_CAPTURE"); } }).result();
    assert.ok(body); assert.match(end.errorMessage, /OFFLINE_CAPTURE/); return body;
  }
  const initial = await payload(contexts[0]), loaded = await payload(contexts[1]);
  assert.deepEqual(loaded.tools, initial.tools); assert.equal(loaded.instructions, initial.instructions); assert.equal(loaded.prompt_cache_key, initial.prompt_cache_key);
  assert.deepEqual(loaded.input.slice(0, initial.input.length), initial.input);
  assert.ok(loaded.input.some(m => m.type === "additional_tools" && m.tools.some(t => t.name === "context_stats")));
  const fallback = await payload(contexts[1], { ...nativeModel, compat: { ...nativeModel.compat, supportsAdditionalTools: false, supportsToolSearch: true } });
  assert.deepEqual(fallback.tools, initial.tools); assert.ok(fallback.input.some(m => m.type === "tool_search_output" && m.tools.some(t => t.name === "context_stats" && t.defer_loading)));
  const unsupported = await payload(contexts[1], { ...nativeModel, compat: { ...nativeModel.compat, supportsAdditionalTools: false, supportsToolSearch: false } });
  assert.ok(unsupported.tools.some(t => t.name === "context_stats"));
  assert.equal(resolveTranscriptTools(contexts[1].messages, true).anchorsAdditions, true);

  // Persist a real pre-change-style SDK transcript and reopen under the new defaults/exposure.
  const legacy = await open({ legacy: true, manager: SessionManager.create(cwd, join(sandbox, "sessions")) });
  let legacyContext;
  provider.setResponses([ctx => { legacyContext = JSON.parse(JSON.stringify(ctx)); return fauxAssistantMessage("Recorded legacy"); }]);
  await legacy.prompt("Record legacy tools.");
  const file = legacy.sessionManager.getSessionFile(); assert.ok(file && existsSync(file));
  const legacyBody = await payload(legacyContext);
  assert.ok(rare.every(n => legacyBody.tools.some(t => t.name === n)));
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
  assert.equal(resolveTranscriptTools(unchangedContext.messages, true).anchorsAdditions, true);
  legacy.setActiveToolsByName(legacy.getActiveToolNames().filter(n => n !== "context_stats"));
  let removedContext;
  provider.setResponses([ctx => { removedContext = JSON.parse(JSON.stringify(ctx)); return fauxAssistantMessage("Keep stats removed"); }]);
  await legacy.prompt("Record a previously removed tool.");
  const removedBody = await payload(removedContext);
  legacy.dispose();
  const resumed = await open({ manager: SessionManager.open(file) });
  assert.ok(rare.filter(n => n !== "context_stats").every(n => resumed.getActiveToolNames().includes(n)), "Resume must retain already declared rare tools");
  assert.ok(!resumed.getActiveToolNames().includes("context_stats"), "Do not resurrect a recorded removal");
  assert.ok(!resumed.getActiveToolNames().includes("tool_search"), "Do not inject a new loader into recorded sessions");
  let resumedContext;
  provider.setResponses([ctx => { resumedContext = JSON.parse(JSON.stringify(ctx)); return fauxAssistantMessage("Resumed"); }]);
  await resumed.prompt("Continue without rewriting tools.");
  const resumedBody = await payload(resumedContext);
  assert.deepEqual(resumedBody.tools, removedBody.tools); assert.equal(resumedBody.instructions, removedBody.instructions);
  assert.deepEqual(resumedBody.input.slice(0, removedBody.input.length), removedBody.input);
  assert.equal(resolveTranscriptTools(resumedContext.messages, true).anchorsAdditions, false);
  const oldBytes = Buffer.byteLength(JSON.stringify(legacyBody.tools)), freshBytes = Buffer.byteLength(JSON.stringify(initial.tools));
  assert.ok(freshBytes < oldBytes, "Fresh schemas including search overhead must be smaller");
  const nameDiff = (a, b) => a.filter(t => !b.some(x => x.name === t.name)).map(t => t.name).sort();
  assert.deepEqual(nameDiff(legacyBody.tools, initial.tools), [...rare].sort());
  assert.deepEqual(nameDiff(initial.tools, legacyBody.tools), ["tool_search"]);
  assert.deepEqual(errors, []); assert.equal(networkAttempts, 0);
  console.log(JSON.stringify({ passed: true, initialSchemaBytes: freshBytes, legacySchemaBytes: oldBytes, savedBytes: oldBytes - freshBytes, removedInitial: rare, addedInitial: ["tool_search"], scope: "Actual remote/preview/context SDK fixture; bytes not tokens and not full personal footer", nativeDiscovery: true, safeExecutors: ["context_stats", "remote status", "context_list"], resumedPrefixStable: true, additivePayloadStable: true, networkAttempts, limitations: "No real cache hits/TTL, live endpoint, SSH connect, rendering/purge, latency or quality measured" }));
} finally {
  for (const session of sessions) session.dispose();
  globalThis.fetch = previousFetch;
  for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  rmSync(sandbox, { recursive: true, force: true });
}

// Keep the actual web activation regression in the same native discovery gate.
await import("./test-web-loader-sdk.mjs");
