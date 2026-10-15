#!/usr/bin/env node
// Real Pi prompt/command lifecycle; faux provider and temporary agent only.
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { findPackageJSON } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

if (!process.argv[2]) throw new Error("Usage: node scripts/test-ponytail-sdk.mjs <node_modules>");
const modules = resolve(process.argv[2]);
const sdkDir = join(modules, "@earendil-works/pi-coding-agent");
const pkg = join(modules, "@dietrichgebert/ponytail");
const root = mkdtempSync(join(tmpdir(), "pi-ponytail-sdk-"));
const keys = ["HOME", "XDG_CONFIG_HOME", "PI_CODING_AGENT_DIR", "PONYTAIL_DEFAULT_MODE"];
const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
process.env.HOME = root;
process.env.XDG_CONFIG_HOME = join(root, "config");
process.env.PI_CODING_AGENT_DIR = join(root, "agent");
process.env.PONYTAIL_DEFAULT_MODE = "full";
mkdirSync(process.env.PI_CODING_AGENT_DIR);
const previousFetch = globalThis.fetch;
let networkAttempts = 0;
globalThis.fetch = async () => { networkAttempts++; throw new Error("Network forbidden in Ponytail test"); };
let session;
try {
  const { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } = await import(pathToFileURL(join(sdkDir, "dist/index.js")));
  const aiDir = dirname(findPackageJSON("@earendil-works/pi-ai", pathToFileURL(join(sdkDir, "dist/index.js"))));
  const { fauxProvider, fauxAssistantMessage, InMemoryCredentialStore } = await import(pathToFileURL(join(aiDir, "dist/index.js")));
  const provider = fauxProvider({ provider: "ponytail-offline-test", api: "faux", models: [{
    id: "faux", name: "Offline test", reasoning: false, input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 64000, maxTokens: 512,
  }] });
  const modelRuntime = await ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null, refreshOnCreate: false });
  modelRuntime.registerNativeProvider(provider.provider);
  const errors = [];
  let loader;
  async function start(extension = true, persistedMode) {
    session?.dispose();
    const settingsManager = SettingsManager.inMemory({ compaction: { enabled: false }, retry: { enabled: false }, packages: [] });
    loader = new DefaultResourceLoader({
      cwd: root, agentDir: process.env.PI_CODING_AGENT_DIR, settingsManager,
      noThemes: true, noPromptTemplates: true,
      additionalExtensionPaths: extension ? [join(pkg, "pi-extension/index.js")] : [],
      additionalSkillPaths: [join(pkg, "skills")],
    });
    await loader.reload();
    assert.deepEqual(loader.getExtensions().errors, []);
    const manager = SessionManager.inMemory(root);
    if (persistedMode) manager.appendCustomEntry("ponytail-mode", { mode: persistedMode });
    ({ session } = await createAgentSession({
      cwd: root, agentDir: process.env.PI_CODING_AGENT_DIR, modelRuntime, model: provider.getModel(), thinkingLevel: "off",
      settingsManager, resourceLoader: loader, sessionManager: manager, tools: ["read"],
    }));
    await session.bindExtensions({ onError: error => errors.push(error) });
  }
  async function run(prompt = "Check current instructions", check = () => {}) {
    let captured;
    provider.setResponses([context => {
      // Assert outside the provider callback: SDK turns callback errors into model errors.
      captured = { prompt: session.systemPrompt, context: JSON.stringify(context) };
      return fauxAssistantMessage("Offline check finished");
    }]);
    let timer, unsubscribe;
    const settled = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`No completed provider run for ${prompt}`)), 5000);
      unsubscribe = session.subscribe(event => {
        if (event.type === "agent_settled" && captured) resolve();
      });
    });
    try {
      await session.prompt(prompt);
      await settled;
      await session.waitForIdle();
    } finally {
      clearTimeout(timer);
      unsubscribe();
    }
    assert.ok(captured, "Command must trigger an actual faux provider run");
    assert.equal(session.getLastAssistantText(), "Offline check finished");
    // Inspect current effective prompt, not historical deltas that mention old modes.
    check(captured.prompt, captured.context);
  }
  const baseName = "<name>ponytail</name>";
  await start();
  for (const mode of ["full", "lite", "ultra", "off", "full"]) {
    await session.prompt(`/ponytail ${mode}`);
    await run(undefined, (prompt, context) => {
      assert.equal(prompt.includes(baseName), mode === "off", `${mode}: base skill discovery`);
      assert.equal(prompt.includes("PONYTAIL MODE ACTIVE"), mode !== "off");
      if (mode !== "off") {
        assert.ok(prompt.includes(`PONYTAIL MODE ACTIVE — level: ${mode}`));
        assert.ok(prompt.includes("Never cut: validation at trust boundaries"));
        assert.equal((prompt.match(/The best code is the code never written/g) || []).length, 1);
      }
      assert.ok(prompt.includes("<name>ponytail-review</name>"));
      assert.ok(prompt.includes("<name>ponytail-audit</name>"));
      assert.ok(context.includes("Never cut") || mode === "off", "Rules reach real provider context");
      assert.ok(loader.getSkills().skills.some(skill => skill.name === "ponytail"), "Never mutate loader resources");
    });
  }
  await run("/skill:ponytail manual-base-argument", (_prompt, context) => {
    assert.ok(context.includes("manual-base-argument"));
    assert.ok(context.includes("# Ponytail"));
    assert.ok(context.includes("## The smallest complete change"));
  });
  for (const name of ["review", "audit"]) {
    const body = readFileSync(join(pkg, `skills/ponytail-${name}/SKILL.md`), "utf8");
    assert.ok(!/plain English|Very simple English/.test(body), `${name} must not force English`);
    assert.ok(body.includes("session language"), `${name} must defer to session language`);
    await run(`/ponytail-${name} explicit-${name}-argument`, (_prompt, context) => {
      assert.ok(context.includes(`explicit-${name}-argument`));
      const firstInstruction = body.replace(/^---[\s\S]*?---\s*/, "").trim().split(/\r?\n/)[0];
      assert.ok(context.includes(firstInstruction), "Alias must expand the actual skill body");
      assert.ok(context.includes("session language"));
    });
  }
  await start(true, "review");
  await run(undefined, prompt => {
    assert.ok(prompt.includes(baseName), "Independent review has no base rules: keep base skill discoverable");
    assert.ok(prompt.includes("Behavior defined by /ponytail-review skill"));
  });
  await start(false);
  await run(undefined, prompt => {
    assert.ok(prompt.includes(baseName), "Standalone base skill remains automatically discoverable");
    assert.ok(!prompt.includes("PONYTAIL MODE ACTIVE"));
  });
  assert.deepEqual(errors, []);
  assert.equal(networkAttempts, 0);
  console.log("PASS real Pi SDK: full/lite/ultra/off/full discovery; rules preserved; loader unchanged; explicit base/review/audit; independent review; standalone; session language; 0 network attempts");
} finally {
  session?.dispose();
  globalThis.fetch = previousFetch;
  for (const key of keys) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
  rmSync(root, { recursive: true, force: true });
}
