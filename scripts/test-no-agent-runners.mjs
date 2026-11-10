#!/usr/bin/env node
// Mandatory offline gate: retired agent runners must not reappear in the managed build.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const read = path => readFileSync(join(root, path), "utf8");
const retired = ["pi-subagents", "pi-herdr-agents"];

const dependencies = JSON.parse(read("npm/package.json")).dependencies;
for (const name of retired) assert.ok(!(name in dependencies), `npm/package.json still pins ${name}`);
const lock = JSON.parse(read("npm/package-lock.json")).packages;
for (const name of retired) {
  assert.ok(!Object.keys(lock).some(path => path === `node_modules/${name}` || path.startsWith(`node_modules/${name}/`)), `npm lock still contains ${name}`);
  assert.ok(!(name in (lock[""]?.dependencies ?? {})), `npm lock root still depends on ${name}`);
}

const settings = JSON.parse(read("configs/settings.json"));
assert.ok(!("subagents" in settings), "configs/settings.json still configures subagents");
const sources = settings.packages.map(item => (typeof item === "string" ? item : item.source));
assert.ok(!sources.some(source => retired.some(name => source.startsWith(`npm:${name}`))), "configs/settings.json still registers a retired runner");

const manifest = JSON.parse(read("manifest.json"));
const managed = manifest.managedConfigs.map(item => `${item.source} ${item.snapshot}`);
for (const needle of ["subagent", "herdr-agents", "herdr-agent-state", "agents/terminal.md"]) {
  assert.ok(!managed.some(entry => entry.includes(needle)), `manifest.json still manages ${needle}`);
}
for (const path of ["configs/subagent", "configs/herdr-agents", "configs/agents/terminal.md", "local-extensions/herdr-agent-state.ts", "scripts/install-terminal-subagent.mjs"]) {
  assert.ok(!existsSync(join(root, path)), `${path} must be removed`);
}

// Installer/uninstaller may only mention a retired name while retiring or accepting legacy state.
const installer = read("install.sh");
assert.ok(!installer.includes("install-terminal-subagent"), "install.sh still runs the terminal installer");
assert.ok(!installer.includes("local-extensions/herdr-agent-state"), "install.sh still provisions the Herdr agent state hook");
for (const line of installer.split("\n").filter(line => retired.some(name => line.includes(`npm:${name}`)))) {
  assert.match(line, /startswith/, `install.sh still provisions a retired runner: ${line.trim()}`);
}
assert.ok(installer.includes('rm -rf "$AGENT_DIR/extensions/subagent" "$AGENT_DIR/herdr-agents"'), "install.sh must retire agent runner files from an existing profile");
assert.ok(installer.includes('rm -f "$AGENT_DIR/agents/terminal.md"'), "install.sh must retire the terminal role file");
const uninstaller = read("uninstall.sh");
for (const line of uninstaller.split("\n").filter(line => /agents\/terminal\.md|herdr-agents\/config\.json|herdr-agent-state|extensions\/subagent/.test(line))) {
  assert.match(line, /retired_runners/, `uninstall.sh must keep retired paths only in the historical set: ${line.trim()}`);
}

const policy = read("configs/APPEND_SYSTEM.md");
assert.ok(!/subagent|pi-herdr-agents|Herdr agents|terminal role|Fusion/i.test(policy), "standing policy must not mention retired agent runners");
for (const needle of ["Use DeepSeek `terminal` as the default executor", "For agents other than `terminal`", "Assign only bounded non-production work to `terminal`"]) {
  assert.ok(!policy.includes(needle), `standing policy still routes work to terminal: ${needle}`);
}

const gate = read("scripts/test-build.py");
assert.ok(!gate.includes("test-terminal-install.mjs"), "gate still runs the retired terminal installer check");
assert.ok(!gate.includes("test-herdr-context-sdk.mjs"), "gate still runs the retired Herdr agent SDK check");
assert.ok(gate.includes("scripts/test-no-agent-runners.mjs"), "gate must run this check");

console.log("PASS no retired agent runners in packages, lock, settings, manifest, installer, policy or gate");
