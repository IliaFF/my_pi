#!/usr/bin/env node
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { findPackageJSON } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const source = resolve(new URL("..", import.meta.url).pathname);
const resourceText = readFileSync(join(source, "configs/AGENTS.md"), "utf8").split("## Resource and effort limits\n\n")[1]?.trim();
assert.ok(resourceText?.startsWith("Use the least costly approach sufficient"));
const modules = resolve(process.argv[2]);
const core = join(modules, "@earendil-works/pi-coding-agent/dist/index.js");
const { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } = await import(pathToFileURL(core));
const { createJiti } = await import(pathToFileURL(join(modules, "@earendil-works/pi-coding-agent/dist/core/extensions/jiti-loader.js")));
const ai = dirname(findPackageJSON("@earendil-works/pi-ai", pathToFileURL(core)));
const { InMemoryCredentialStore } = await import(pathToFileURL(join(ai, "dist/index.js")));
const jiti = createJiti(import.meta.url, { alias: { "@earendil-works/pi-coding-agent": core } });
const aitunnel = await jiti.import(join(source, "local-extensions/aitunnel.ts"), { default: true });
let definition;
aitunnel({ registerProvider(name, options) { assert.equal(name, "aitunnel"); definition = options; } });
assert.equal(definition.apiKey, "$AITUNNEL_API_KEY");
assert.equal(definition.baseUrl, "https://api.aitunnel.ru/v1/");
const temp = mkdtempSync(join(tmpdir(), "pi-firstmate-policy-"));
const agent = join(temp, "agent"), cwd = join(temp, "project");
const previousFetch = globalThis.fetch;
const saved = Object.fromEntries(["HOME", "PI_CODING_AGENT_DIR", "AITUNNEL_API_KEY"].map(k => [k, process.env[k]]));
let session, networkAttempts = 0;
globalThis.fetch = async () => { networkAttempts++; throw new Error("Network forbidden"); };
try {
  mkdirSync(agent); mkdirSync(join(cwd, ".pi"), { recursive: true });
  process.env.HOME = join(temp, "home"); mkdirSync(process.env.HOME);
  process.env.PI_CODING_AGENT_DIR = agent;
  delete process.env.AITUNNEL_API_KEY;
  for (const name of ["AGENTS.md", "APPEND_SYSTEM.md"]) copyFileSync(join(source, "configs", name), join(agent, name));
  writeFileSync(join(cwd, ".pi/APPEND_SYSTEM.md"), "PROJECT_APPEND_SENTINEL\n");
  const settingsManager = SettingsManager.inMemory({ compaction: { enabled: false } });
  settingsManager.setProjectTrusted(true);
  const loader = new DefaultResourceLoader({ cwd, agentDir: agent, settingsManager, noExtensions: true, noThemes: true, noPromptTemplates: true,
    additionalSkillPaths: ["cpp-styleguide", "python-styleguide", "latex-simple-style"].map(s => join(source, "skills", s)), extensionFactories: [aitunnel] });
  await loader.reload();
  assert.deepEqual(loader.getExtensions().errors, []);
  assert.deepEqual(loader.getSkills().skills.map(s => s.name).sort(), ["cpp-styleguide", "latex-simple-style", "python-styleguide"]);
  const runtime = await ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null, refreshOnCreate: false });
  ({ session } = await createAgentSession({ cwd, agentDir: agent, modelRuntime: runtime, model: runtime.getModel("openai-codex", "gpt-6.1-sol"), settingsManager,
    resourceLoader: loader, sessionManager: SessionManager.inMemory(cwd) }));
  assert.ok(session.systemPrompt.includes("PROJECT_APPEND_SENTINEL"));
  assert.equal(session.systemPrompt.split(resourceText).length - 1, 1, "Trusted project override must retain exactly one resource rule");
  assert.ok(!session.systemPrompt.includes("# Long-lived delegation"), "Project append must replace global append, not concatenate it");
  assert.ok(session.systemPrompt.includes(readFileSync(join(source, "configs/AGENTS.md"), "utf8").trim()), "Global context exception must survive actual SDK project append precedence");
  assert.ok(runtime.getModel("aitunnel", "deepseek-v4.1-flash-1017"), "Provider must register without installed credentials");
  session.dispose(); session = undefined;
  settingsManager.setProjectTrusted(false);
  await loader.reload();
  assert.ok(loader.getAppendSystemPrompt().join("\n").includes("Outside Firstmate sessions"));
  assert.ok(!loader.getAppendSystemPrompt().join("\n").includes("PROJECT_APPEND_SENTINEL"));
  ({ session } = await createAgentSession({ cwd, agentDir: agent, modelRuntime: runtime, model: runtime.getModel("openai-codex", "gpt-6.1-sol"), settingsManager,
    resourceLoader: loader, sessionManager: SessionManager.inMemory(cwd) }));
  assert.equal(session.systemPrompt.split(resourceText).length - 1, 1, "Default global APPEND and AGENTS must not duplicate the resource rule");
  assert.equal(networkAttempts, 0);
  console.log("PASS actual SDK global AGENTS survives trusted project APPEND override; untrusted project skipped; 3 skills and credential-free AITunnel registration load (no model/MCP/fleet calls)");
} finally {
  session?.dispose();
  globalThis.fetch = previousFetch;
  for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  rmSync(temp, { recursive: true, force: true });
}
