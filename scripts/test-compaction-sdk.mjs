// Real SDK + faux provider: no credentials, network or model billing.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { findPackageJSON } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const modules = resolve(process.argv[2] ?? "npm/node_modules");
const root = resolve(new URL("..", import.meta.url).pathname);
const sdk = join(modules, "@earendil-works/pi-coding-agent");
const temp = mkdtempSync(join(tmpdir(), "pi-compaction-sdk-"));
const keys = ["HOME", "PI_CODING_AGENT_DIR", "XDG_CONFIG_HOME"];
const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
process.env.HOME = temp;
process.env.PI_CODING_AGENT_DIR = join(temp, "agent");
process.env.XDG_CONFIG_HOME = join(temp, "config");
mkdirSync(process.env.PI_CODING_AGENT_DIR);
let session;
try {
  const { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } =
    await import(pathToFileURL(join(sdk, "dist/index.js")));
  const ai = dirname(findPackageJSON("@earendil-works/pi-ai", pathToFileURL(join(sdk, "dist/index.js"))));
  const { fauxProvider, fauxAssistantMessage, InMemoryCredentialStore } = await import(pathToFileURL(join(ai, "dist/index.js")));
  const runtime = await ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null,
    modelsStorePath: join(temp, "models-store.json"), refreshOnCreate: false });
  const provider = fauxProvider({ provider: "compaction-offline", api: "faux", models: [{
    id: "faux", name: "Compaction offline", reasoning: false, input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1000000, maxTokens: 512,
  }] });
  runtime.registerNativeProvider(provider.provider);
  const errors = [];
  async function start({ smallWindow = false } = {}) {
    session?.dispose();
    const settingsManager = SettingsManager.inMemory({ compaction: { enabled: true,
      reserveTokens: 12500, keepRecentTokens: 12000 }, retry: { enabled: false }, packages: [] });
    const loader = new DefaultResourceLoader({ cwd: temp, agentDir: process.env.PI_CODING_AGENT_DIR,
      settingsManager, noSkills: true, noThemes: true, noPromptTemplates: true,
      additionalExtensionPaths: [join(modules, "context-fold/index.ts"),
        join(root, "local-extensions/auto-ultra-compact/index.ts")],
    });
    await loader.reload();
    assert.deepEqual(loader.getExtensions().errors, []);
    const manager = SessionManager.create(temp, join(temp, "sessions"));
    assert.equal(manager.getSessionDir(), join(temp, "sessions"), "context-fold artifacts must stay in the temporary fixture");
    for (let i = 0; i < 8; i++) {
      manager.appendMessage({ role: "user", content: `Older request ${i}`, timestamp: i * 2 });
      manager.appendMessage({ ...fauxAssistantMessage("x".repeat(20000)), timestamp: i * 2 + 1 });
    }
    ({ session } = await createAgentSession({ cwd: temp, agentDir: process.env.PI_CODING_AGENT_DIR,
      modelRuntime: runtime, model: { ...provider.getModel(), contextWindow: smallWindow ? 50000 : 1000000 },
      thinkingLevel: "off", settingsManager, sessionManager: manager, resourceLoader: loader, tools: [] }));
    await session.bindExtensions({ onError: error => errors.push(error) });
    return manager;
  }
  const large = await start();
  const requests = [];
  provider.setResponses([context => {
    requests.push(JSON.stringify(context));
    return fauxAssistantMessage("Direct answer");
  }]);
  await session.prompt("Direct request");
  await session.waitForIdle();
  assert.equal(requests.length, 1, "normal prompt must not issue a recall probe");
  assert.ok(requests[0].includes("Direct request"));
  assert.ok(!requests[0].includes("Recall check"));
  assert.equal(large.getEntries().filter(e => e.type === "compaction").length, 0);
  const native = await start({ smallWindow: true });
  provider.setResponses([fauxAssistantMessage("Native small window answered")]);
  await session.prompt("Small window request");
  await session.waitForIdle();
  assert.ok(native.getEntries().some(e => e.type === "compaction"), "native reserve protection runs below 500k");
  const compactions = native.getEntries().filter(e => e.type === "compaction");
  assert.equal(compactions.length, 1);
  assert.match(compactions[0].summary, /deterministic seed index/);
  assert.equal(session.isCompacting, false);
  assert.deepEqual(errors, []);
  console.log("PASS real SDK: direct response without recall probe, native smaller-window deterministic compaction; no external calls");
} finally {
  session?.dispose();
  for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
  rmSync(temp, { recursive: true, force: true });
}
