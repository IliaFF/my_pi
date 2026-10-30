#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const policy = readFileSync(join(root, "configs/APPEND_SYSTEM.md"), "utf8");
assert.ok(policy.includes("Outside Firstmate sessions"));
assert.ok(policy.includes("including those injected by tools or the TODO queue"));
assert.ok(policy.includes("In all sessions, never abandon unfinished work or checks"));
assert.ok(!policy.includes("When delegation is needed, discover Herdr tools"));
const dependencies = JSON.parse(readFileSync(join(root, "npm/package.json"), "utf8")).dependencies;
assert.equal(dependencies["pi-workspace-history"], "0.5.2");
assert.ok(!("pi-herdr-agents" in dependencies));
const stack = JSON.parse(readFileSync(join(root, "stack/lock.json"), "utf8"));
assert.equal(stack.firstmate.repository, "https://github.com/kunchenguid/firstmate.git");
assert.equal(stack.firstmate.commit, "7da4c3621370534ff9689843d2b77f34158057fb");
assert.equal(stack.paper.commit, "cab1b5cc276a0cd004a0044003926a6440088049");
assert.equal(stack.python, "3.13.7");
assert.deepEqual(Object.fromEntries(stack.artifacts.map(a => [a.name, a.version])), { herdr: "0.9.5", treehouse: "3.1.6", gh: "2.103.3", jq: "1.8.1" });
for (const artifact of stack.artifacts) assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
const mcpPackage = JSON.parse(readFileSync(join(root, "stack/package.json"), "utf8"));
const mcpLock = JSON.parse(readFileSync(join(root, "stack/package-lock.json"), "utf8"));
assert.equal(mcpPackage.dependencies["@jkudish/jev-browser"], "0.8.3");
assert.deepEqual(mcpPackage.dependencies, mcpLock.packages[""].dependencies);
assert.equal(mcpLock.packages["node_modules/@jkudish/jev-browser"].version, "0.8.3");
const servers = JSON.parse(readFileSync(join(root, "configs/mcp.json"), "utf8")).mcpServers;
assert.equal(servers["jev-browser"].enabled, false);
assert.equal(servers["jev-browser"].env.OPENROUTER_API_KEY, "${OPENROUTER_API_KEY}");
assert.equal(servers["paper-search"].exposure, "codemode");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
for (const name of ["AGENTS.md", "mcp.json", "extensions/aitunnel.ts", ...["cpp-styleguide", "python-styleguide", "latex-simple-style"].map(s => `skills/${s}/SKILL.md`)]) {
  const config = manifest.managedConfigs.find(c => c.source === name);
  assert.equal(config.restore, false, name);
  assert.equal(config.snapshotRuntime, false, name);
}
const fallback = readFileSync(join(root, "configs/AGENTS.md"), "utf8");
assert.ok(fallback.includes("## Сессии Firstmate"));
const sections = fallback.trim().split(/(?=^## )/m).map(s => s.trim()).filter(Boolean);
const firstmateSection = sections.find(s => s.startsWith("## Сессии Firstmate"));
const resourceSection = sections.find(s => s.startsWith("## Resource and effort limits"));
assert.ok(resourceSection?.includes("supervisors must pass this constraint to workers and cannot approve such expansion on the user\'s behalf."));
assert.ok(!policy.includes("Use the least costly approach sufficient"), "New default templates must not duplicate the resource paragraph in APPEND");
assert.ok(fallback.includes("В остальных сессиях правила смены задач сохраняются"));
assert.ok(!/SSH|ProxyJump|\/home\/|\/mnt\/|\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(fallback));
const installer = readFileSync(join(root, "install.sh"), "utf8");
const script = installer.slice(installer.indexOf("# Personal configuration start"), installer.indexOf("# Personal configuration end"));
const agent = mkdtempSync(join(tmpdir(), "pi-stack-instructions-"));
try {
  const deploy = () => spawnSync("bash", ["-euc", script], {
    env: { ...process.env, ROOT: root, AGENT_DIR: agent, CONTEXT_SETTINGS: join(agent, "my-pi-settings.json"), PRESERVE_SETTINGS: "1" },
    encoding: "utf8", timeout: 30000,
  });
  const original = "# Private instructions\n\nKeep my private rule exactly.\n";
  writeFileSync(join(agent, "AGENTS.md"), original);
  writeFileSync(join(agent, "APPEND_SYSTEM.md"), "PRIVATE APPEND\n");
  writeFileSync(join(agent, "settings.json"), JSON.stringify({ privateSetting: true, packages: ["npm:pi-herdr-agents@3.3.1", "npm:private-example@1.2.3"] }));
  writeFileSync(join(agent, "mcp.json"), JSON.stringify({ mcpServers: { "jev-browser": { command: "PRIVATE EXISTING COMMAND" }, private: { command: "private-server" } } }));
  let result = deploy();
  assert.equal(result.status, 0, result.stderr);
  const installed = readFileSync(join(agent, "AGENTS.md"), "utf8");
  assert.ok(installed.startsWith(original));
  assert.ok(installed.includes(fallback.trim()));
  const settings = JSON.parse(readFileSync(join(agent, "settings.json"), "utf8"));
  assert.equal(settings.privateSetting, true);
  assert.deepEqual(settings.packages, ["npm:private-example@1.2.3", "npm:pi-workspace-history@0.5.2"]);
  const configured = JSON.parse(readFileSync(join(agent, "mcp.json"), "utf8")).mcpServers;
  assert.equal(configured["jev-browser"].command, "PRIVATE EXISTING COMMAND");
  assert.equal(configured.private.command, "private-server");
  assert.equal(configured["paper-search"].command, join(agent, "bin/paper-search-mcp"));
  assert.equal(readFileSync(join(agent, "APPEND_SYSTEM.md"), "utf8"), "PRIVATE APPEND\n");
  result = deploy();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(agent, "AGENTS.md"), "utf8"), installed, "Reinstall must be idempotent");
  const previousProfile = original + "\n" + firstmateSection + "\n\n## Private section\n\nKEEP PRIVATE CONTENT\n";
  writeFileSync(join(agent, "AGENTS.md"), previousProfile);
  result = deploy();
  assert.equal(result.status, 0, result.stderr);
  const upgraded = readFileSync(join(agent, "AGENTS.md"), "utf8");
  assert.ok(upgraded.startsWith(previousProfile));
  assert.equal(upgraded.split(firstmateSection).length - 1, 1);
  assert.equal(upgraded.split(resourceSection).length - 1, 1);
  assert.equal(deploy().status, 0);
  assert.equal(readFileSync(join(agent, "AGENTS.md"), "utf8"), upgraded);
  const indentedConflict = original + "\n  ## Resource and effort limits\n\nPRIVATE CONFLICT\n";
  writeFileSync(join(agent, "AGENTS.md"), indentedConflict);
  result = deploy();
  assert.notEqual(result.status, 0, "Indented conflicting heading must not allow appending contradictory rules");
  assert.equal(readFileSync(join(agent, "AGENTS.md"), "utf8"), indentedConflict);
  const conflict = original + "\n## Resource and effort limits\n\nPRIVATE CONFLICT\n";
  writeFileSync(join(agent, "AGENTS.md"), conflict);
  result = deploy();
  assert.notEqual(result.status, 0, "Any managed-section conflict must fail before appending another section");
  assert.equal(readFileSync(join(agent, "AGENTS.md"), "utf8"), conflict);
  writeFileSync(join(agent, "AGENTS.md"), original + "\n## Сессии Firstmate\n\nCustom conflicting rule.\n");
  result = deploy();
  assert.notEqual(result.status, 0, "Conflicting private section must not be silently overwritten");
  assert.equal(readFileSync(join(agent, "AGENTS.md"), "utf8"), original + "\n## Сессии Firstmate\n\nCustom conflicting rule.\n");
} finally {
  rmSync(agent, { recursive: true, force: true });
}
console.log("PASS portable Firstmate policy, private instructions, idempotence and conflict refusal");
