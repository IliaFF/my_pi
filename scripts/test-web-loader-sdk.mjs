#!/usr/bin/env node
// Actual web package and native SDK lifecycle; no search, transport or credentials.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { findPackageJSON } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const modules = resolve(process.argv[2]);
const root = mkdtempSync(join(tmpdir(), "pi-web-loader-sdk-"));
const keys = ["HOME", "XDG_CONFIG_HOME", "PI_CODING_AGENT_DIR"];
const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
process.env.HOME = root;
process.env.XDG_CONFIG_HOME = join(root, "config");
process.env.PI_CODING_AGENT_DIR = join(root, "agent");
mkdirSync(process.env.PI_CODING_AGENT_DIR);
// Configured names, not hardcoded defaults; disabled capabilities must stay disabled.
const config = {
  toolActivation: "dynamic", toolNames: { webSearch: "research_search" },
  tools: { fetchContent: { enabled: false }, sourceCheck: { enabled: false } },
};
writeFileSync(join(process.env.PI_CODING_AGENT_DIR, "web-search.json"), JSON.stringify(config));
const fetchBefore = globalThis.fetch;
let networkAttempts = 0;
globalThis.fetch = async () => { networkAttempts++; throw new Error("Network forbidden"); };
const sessions = [];
try {
  const core = join(modules, "@earendil-works/pi-coding-agent/dist/index.js");
  const { createAgentSession, createToolSearchExtension, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } = await import(pathToFileURL(core));
  const ai = dirname(findPackageJSON("@earendil-works/pi-ai", pathToFileURL(core)));
  const { fauxProvider, fauxAssistantMessage, fauxToolCall, InMemoryCredentialStore } = await import(pathToFileURL(join(ai, "dist/index.js")));
  const web = (await import(pathToFileURL(join(modules, "pi-web-access/dist/index.js")))).default;
  const runtime = await ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null, refreshOnCreate: false });
  const provider = fauxProvider({ provider: "offline-web-loader", api: "faux", models: [{
    id: "fixture", name: "Fixture", reasoning: false, input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 64000, maxTokens: 512,
  }] });
  runtime.registerNativeProvider(provider.provider);
  const errors = [];
  async function open({ eager = false, manager = SessionManager.create(root, join(root, "sessions")) } = {}) {
    const settingsManager = SettingsManager.inMemory({ defaultTools: ["+tool_search"], packages: [], compaction: { enabled: false }, retry: { enabled: false } });
    const loader = new DefaultResourceLoader({ cwd: root, agentDir: process.env.PI_CODING_AGENT_DIR,
      settingsManager, noExtensions: true, noSkills: true, noThemes: true, noPromptTemplates: true,
      extensionFactories: [createToolSearchExtension(), web],
    });
    await loader.reload();
    assert.deepEqual(loader.getExtensions().errors, []);
    const model = { ...provider.getModel(), compat: eager ? {} : { supportsMidConvoSystemMessages: true, supportsAdditionalTools: true } };
    const { session } = await createAgentSession({ cwd: root, agentDir: process.env.PI_CODING_AGENT_DIR,
      modelRuntime: runtime, model, thinkingLevel: "off", resourceLoader: loader, settingsManager, sessionManager: manager,
    });
    sessions.push(session);
    await session.bindExtensions({ onError: error => errors.push(String(error)) });
    return session;
  }
  function declared(context) {
    // Effective declarations after native transcript deltas, not historical mention counts.
    const names = new Map((context.tools ?? []).map(tool => [tool.name, tool]));
    for (const message of context.messages) {
      if (message.role !== "system") continue;
      for (const tool of message.toolsRemoved ?? []) names.delete(tool.name);
      for (const tool of message.toolsAdded ?? []) names.set(tool.name, tool);
    }
    return [...names.values()];
  }
  const contexts = [];
  const session = await open();
  assert.ok(session.getActiveToolNames().includes("web_enable"));
  assert.ok(!session.getActiveToolNames().includes("research_search"));
  provider.setResponses([
    context => { contexts.push(context); return fauxAssistantMessage([fauxToolCall("web_enable", {})]); },
    context => { contexts.push(context); return fauxAssistantMessage("Enabled without search"); },
  ]);
  await session.prompt("Enable the configured web tools, but do not search or fetch.");
  assert.equal(contexts.length, 2);
  assert.ok(contexts[1].messages.some(message => message.role === "toolResult" && message.toolName === "web_enable" && !message.isError));
  const first = declared(contexts[0]), enabled = declared(contexts[1]);
  assert.ok(first.some(tool => tool.name === "web_enable"));
  assert.ok(enabled.some(tool => tool.name === "research_search"));
  const loader = first.find(tool => tool.name === "web_enable");
  console.log(JSON.stringify({ measurement: "UTF-8 JSON of actual faux-provider tool definition", loaderBytes: Buffer.byteLength(JSON.stringify(loader)), initialNames: first.map(tool => tool.name), enabledNames: enabled.map(tool => tool.name) }));
  assert.ok(!enabled.some(tool => tool.name === "web_enable"), "Redundant loader must not reach next provider request");
  assert.ok(session.getAllTools().some(tool => tool.name === "web_enable"), "Loader stays registered");
  for (const name of ["web_search", "fetch_content", "source_check"]) assert.ok(!session.getAllTools().some(tool => tool.name === name));
  writeFileSync(join(process.env.PI_CODING_AGENT_DIR, "web-search.json"), JSON.stringify({ ...config, toolExposure: "deferred" }));
  const discovered = await open();
  let discovery;
  provider.setResponses([
    () => fauxAssistantMessage([fauxToolCall("tool_search", { query: "research_search", limit: 1 })]),
    () => fauxAssistantMessage([fauxToolCall("tool_search", { query: "get_search_content", limit: 1 })]),
    context => { discovery = declared(context); return fauxAssistantMessage("Discovered without search"); },
  ]);
  await discovered.prompt("Discover configured definitions only; do not execute web research.");
  assert.ok(discovery.some(tool => tool.name === "research_search"));
  assert.ok(discovery.some(tool => tool.name === "get_search_content"));
  assert.ok(!discovery.some(tool => tool.name === "web_enable"), "Discovery must also remove redundant loader");
  writeFileSync(join(process.env.PI_CODING_AGENT_DIR, "web-search.json"), JSON.stringify(config));
  const resumed = await open({ manager: SessionManager.open(session.sessionManager.getSessionFile()) });
  assert.ok(!resumed.getActiveToolNames().includes("web_enable"), "All-active resume omits loader");
  // A missing configured tool restores the loader before the next request.
  resumed.setActiveToolsByName(resumed.getActiveToolNames().filter(name => name !== "research_search"));
  let partial;
  provider.setResponses([context => { partial = declared(context); return fauxAssistantMessage("Partial loadout"); }]);
  await resumed.prompt("Inspect only");
  assert.ok(partial.some(tool => tool.name === "web_enable"));
  const partialResume = await open({ manager: SessionManager.open(resumed.sessionManager.getSessionFile()) });
  assert.ok(partialResume.getActiveToolNames().includes("web_enable"));
  writeFileSync(join(process.env.PI_CODING_AGENT_DIR, "web-search.json"), JSON.stringify({ ...config, toolActivation: "auto" }));
  const eager = await open({ eager: true });
  provider.setResponses([() => fauxAssistantMessage("Eager adapter")]);
  await eager.prompt("Inspect only");
  assert.ok(eager.getActiveToolNames().includes("research_search"));
  assert.ok(!eager.getActiveToolNames().includes("web_enable"));
  assert.deepEqual(errors, []);
  assert.equal(networkAttempts, 0);
  console.log("PASS actual SDK web loader: lazy activation, all/partial loadouts, resume, eager adapter, renamed/disabled capabilities; 0 network attempts");
} finally {
  for (const session of sessions) session.dispose();
  globalThis.fetch = fetchBefore;
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
  }
  rmSync(root, { recursive: true, force: true });
}
