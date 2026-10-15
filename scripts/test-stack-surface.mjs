#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Uses installed packages, fake UI/credentials, and no network or model calls.
const agent = resolve(process.argv[2]);
const modules = join(agent, "npm/node_modules");
const core = join(modules, "@earendil-works/pi-coding-agent/dist/index.js");
const require = createRequire(core);
const { createJiti } = await import(pathToFileURL(join(modules, "@earendil-works/pi-coding-agent/dist/core/extensions/jiti-loader.js")));
const jiti = createJiti(import.meta.url, { alias: {
  "@sinclair/typebox": require.resolve("typebox"),
  "@earendil-works/pi-coding-agent": core,
  "@earendil-works/pi-tui": require.resolve("@earendil-works/pi-tui"),
} });
const state = mkdtempSync(join(tmpdir(), "pi-stack-surface-"));
process.env.PI_CODING_AGENT_DIR = state;
const host = () => {
  const handlers = new Map(), commands = new Map(), entries = [];
  let active = ["read", "bash", "ask_user_question"];
  const pi = {
    on(name, fn) { const list = handlers.get(name) || []; list.push(fn); handlers.set(name, list); },
    registerCommand(name, definition) { commands.set(name, definition); },
    appendEntry(customType, data) { entries.push({ type: "custom", customType, data }); },
    getActiveTools() { return active; }, setActiveTools(names) { active = names; },
  };
  return { pi, commands, entries, active: () => active,
    async emit(name, ctx, event = {}) { let result; for (const fn of handlers.get(name) || []) result = await fn(event, ctx) ?? result; return result; },
  };
};
try {
  assert.ok(!existsSync(join(modules, "pi-canary")), "Canary must be uninstalled");
  assert.ok(!existsSync(join(agent, "extensions/tools.ts")), "legacy tools owner must be removed");

  assert.ok(!existsSync(join(modules, "pi-caveman")), "Caveman must be uninstalled");
  assert.ok(existsSync(join(modules, "@dietrichgebert/ponytail")), "Ponytail must remain installed");
  console.log("PASS Caveman absent and Ponytail preserved");

  const rpiv = host();
  const { registerAskUserQuestionReconciler } = await jiti.import(join(modules, "@juicesharp/rpiv-ask-user-question/reconcile.ts"));
  registerAskUserQuestionReconciler(rpiv.pi);
  await rpiv.emit("session_start", { hasUI: false });
  assert.ok(!rpiv.active().includes("ask_user_question"), "RPIV must remove unusable tool before first turn");
  await rpiv.emit("before_agent_start", { hasUI: true });
  assert.ok(rpiv.active().includes("ask_user_question"));
  console.log("PASS RPIV first-turn no-UI guard and UI tool restoration");

  const { hasCodexAuth, getCodexUsage } = await jiti.import(join(modules, "@beyona/pi-zai-usage/dist/codex-api.js"));
  const context = provider => {
    const model = { provider, id: "gpt-6.1-sol" };
    return { model, modelRegistry: { getAvailable: () => [model], getAll: () => [model], getApiKeyAndHeaders: async () => ({ ok: true, apiKey: "FAKE_TEST_TOKEN" }) } };
  };
  assert.equal(await hasCodexAuth(context("openai-codex")), true);
  assert.equal(await hasCodexAuth(context("openai")), false);
  await assert.rejects(getCodexUsage(context("openai")), error => error.code === "codex-no-auth");
  console.log("PASS quota compatibility probe: legacy supported; new OpenAI-only gpt-6.1-sol credentials are NOT supported by pi-zai-usage 1.1.0 (mocked, no login/network)");
} finally {
  rmSync(state, { recursive: true, force: true });
}
