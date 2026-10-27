// Real SDK + faux provider: no credentials, network or model billing.
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { findPackageJSON } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const modules = resolve(process.argv[2] ?? "npm/node_modules");
const root = resolve(new URL("..", import.meta.url).pathname);
const sdk = join(modules, "@earendil-works/pi-coding-agent");
const temp = mkdtempSync(join(tmpdir(), "pi-canary-sdk-"));
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
  cpSync(join(modules, "pi-canary/extensions"), join(temp, "canary"), { recursive: true });
  const config = JSON.parse(readFileSync(join(root, "configs/pi-canary.json")));
  assert.deepEqual(config, { COUNT: 3, POSITION: "equidistant", VARIANT: "fixed", FAIL_COMPACT: 3 });
  writeFileSync(join(temp, "canary/canary.json"), JSON.stringify(config));
  const runtime = await ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null,
    modelsStorePath: join(temp, "models-store.json"), refreshOnCreate: false });
  const provider = fauxProvider({ provider: "canary-offline", api: "faux", models: [{
    id: "faux", name: "Canary offline", reasoning: false, input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 1000000, maxTokens: 512,
  }] });
  runtime.registerNativeProvider(provider.provider);
  const errors = [];
  async function start({ failCompact = false, smallWindow = false } = {}) {
    session?.dispose();
    const settingsManager = SettingsManager.inMemory({ compaction: { enabled: true,
      reserveTokens: 12500, keepRecentTokens: 12000 }, retry: { enabled: false }, packages: [] });
    const loader = new DefaultResourceLoader({ cwd: temp, agentDir: process.env.PI_CODING_AGENT_DIR,
      settingsManager, noSkills: true, noThemes: true, noPromptTemplates: true,
      additionalExtensionPaths: [join(modules, "context-fold/index.ts"),
        join(root, "local-extensions/auto-ultra-compact/index.ts"),
        ...(smallWindow ? [] : [join(temp, "canary/index.ts")])],
      extensionFactories: failCompact ? [(pi) => pi.on("session_before_compact", () => ({ cancel: true }))] : [],
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
  async function run(prompt, pass = false, highUsage = false) {
    const contexts = [];
    provider.setResponses([
      context => {
        const serialized = JSON.stringify(context);
        contexts.push(serialized);
        const message = fauxAssistantMessage(pass ? [...new Set(serialized.match(/[a-f0-9]{32}/g))].join("\n") : "Missing markers");
        if (highUsage) message.usage = { ...message.usage, input: 510000, totalTokens: 510001 };
        return message;
      },
      context => { contexts.push(JSON.stringify(context)); return fauxAssistantMessage(`Answered ${prompt}`); },
    ]);
    let timer, unsubscribe;
    const answered = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`Original request did not resume: ${prompt}`)), 5000);
      unsubscribe = session.subscribe(event => {
        if (event.type === "message_end" && event.message.role === "assistant" &&
          JSON.stringify(event.message.content).includes(`Answered ${prompt}`)) resolve();
      });
    });
    // Attach rejection handling before prompt() can take longer than the deadline.
    const result = answered.catch(error => error);
    try {
      await session.prompt(prompt);
      const error = await result;
      if (error instanceof Error) throw error;
      await session.waitForIdle();
    } finally { clearTimeout(timer); unsubscribe(); }
    assert.equal(contexts.length, 2, "one check plus one real response, not a verification loop");
    assert.ok(contexts[1].includes(prompt), "the original user request survives");
    assert.ok(!contexts[1].includes("Recall check"), "verification is not sent to the real answer");
    return contexts;
  }
  const manager = await start();
  await run("normal success", true);
  for (let i = 1; i <= 3; i++) {
    await run(`failure ${i}`);
    assert.equal(manager.getEntries().filter(e => e.type === "compaction").length, i === 3 ? 1 : 0);
  }
  assert.equal(session.isCompacting, false);
  assert.deepEqual(errors, []);
  const compact = manager.getEntries().find(e => e.type === "compaction");
  assert.match(compact.summary, /deterministic seed index/);
  await start({ failCompact: true });
  for (let i = 1; i <= 3; i++) await run(`compact error ${i}`);
  assert.equal(session.isCompacting, false);
  assert.deepEqual(errors, [], "cancelled compaction must not become an extension error or retry loop");
  const high = await start();
  await run("500k verification success", true, true);
  assert.ok(high.getEntries().filter(e => e.type === "compaction").length <= 1, "no competing compact attempts");
  await start();
  await run("500k failure one");
  await run("500k failure two");
  await run("500k failure three", false, true);
  assert.deepEqual(errors, [], "Canary and the cap must not race compaction");
  const native = await start({ smallWindow: true });
  provider.setResponses([fauxAssistantMessage("Native small window answered")]);
  await session.prompt("Small window request");
  await session.waitForIdle();
  assert.ok(native.getEntries().some(e => e.type === "compaction"), "native reserve protection runs below 500k");
  // Delayed compact callbacks must not send into a replacement session.
  const { default: factory } = await import(pathToFileURL(join(temp, "canary/canary.ts")));
  const handlers = new Map(), sent = [];
  let callbacks;
  factory({ on: (name, fn) => handlers.set(name, fn), registerCommand() {},
    sendMessage: (...args) => sent.push(args) });
  const ctx = { hasUI: false, ui: { notify() {} }, compact: options => { callbacks = options; } };
  for (let i = 0; i < 3; i++) {
    handlers.get("before_agent_start")({}, ctx);
    handlers.get("context")({ messages: [{ role: "user", content: "original" }] }, ctx);
    handlers.get("message_end")({ message: { role: "assistant", content: [{ type: "text", text: "missing" }], timestamp: i } }, ctx);
    if (i < 2) handlers.get("message_end")({ message: { role: "assistant", content: [] } }, ctx);
  }
  assert.ok(callbacks);
  handlers.get("session_shutdown")({}, ctx);
  handlers.get("session_start")({}, ctx);
  const before = sent.length;
  callbacks.onComplete();
  callbacks.onError(new Error("late failure"));
  assert.equal(sent.length, before, "old callbacks cannot continue in a new session");
  handlers.get("before_agent_start")({}, ctx);
  const verification = handlers.get("context")({ messages: [{ role: "user", content: "same millisecond", timestamp: 7 }] }, ctx);
  const tokens = JSON.stringify(verification).match(/[a-f0-9]{32}/g);
  handlers.get("message_end")({ message: { role: "assistant", content: [{ type: "text", text: tokens.join("\n") }], timestamp: 7 } }, ctx);
  const clean = handlers.get("context")({ messages: [{ role: "user", content: "same millisecond", timestamp: 7 },
    { role: "assistant", content: [], timestamp: 7 }] }, ctx);
  assert.equal(clean.messages[0].content, "same millisecond", "timestamp collision must not remove the user request");
  console.log("PASS Canary real SDK: pass, three failures, deterministic compact, error continuation, native smaller-window protection; stale callback guard; no external calls");
} finally {
  session?.dispose();
  for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
  rmSync(temp, { recursive: true, force: true });
}
