#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
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
assert.ok(!("@amaster.ai/pi-browser-use" in dependencies));
const npmLock = JSON.parse(readFileSync(join(root, "npm/package-lock.json"), "utf8"));
assert.ok(!("node_modules/chrome-devtools-mcp" in npmLock.packages));
const servers = JSON.parse(readFileSync(join(root, "configs/mcp.json"), "utf8")).mcpServers;
assert.deepEqual(Object.keys(servers), ["paper-search"]);
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
const modeHelp = spawnSync("bash", [join(root, "install.sh"), "--skip-stack", "--help"], { encoding: "utf8", timeout: 10000 });
assert.equal(modeHelp.status, 0, modeHelp.stderr);
assert.ok(modeHelp.stdout.includes("--skip-stack"));
const stackGuards = installer.match(/if \(\(!SKIP_STACK\)\); then\n  node [^\n]*install-stack\.mjs[^\n]*\nfi/g);
assert.equal(stackGuards?.length, 2, "Both private-stack preflight and bootstrap must be guarded");
for (const guard of stackGuards) {
  for (const skip of ["0", "1"]) {
    const result = spawnSync("bash", ["-euc", 'node() { echo invoked; return 47; };\n' + guard], {
      env: { ...process.env, SKIP_STACK: skip, ROOT: root, AGENT_DIR: "/unused-fixture" },
      encoding: "utf8", timeout: 10000,
    });
    assert.equal(result.status, skip === "1" ? 0 : 47, result.stderr);
    assert.equal(result.stdout.includes("invoked"), skip === "0");
  }
}
const script = installer.slice(installer.indexOf("# Personal configuration start"), installer.indexOf("# Personal configuration end"));
const agent = mkdtempSync(join(tmpdir(), "pi-stack-instructions-"));
try {
  const deploy = (skipStack = "0") => spawnSync("bash", ["-euc", script], {
    env: { ...process.env, ROOT: root, AGENT_DIR: agent, CONTEXT_SETTINGS: join(agent, "my-pi-settings.json"), PRESERVE_SETTINGS: "1", SKIP_STACK: skipStack },
    encoding: "utf8", timeout: 30000,
  });
  const original = "# Private instructions\n\nKeep my private rule exactly.\n";
  writeFileSync(join(agent, "AGENTS.md"), original);
  writeFileSync(join(agent, "APPEND_SYSTEM.md"), "PRIVATE APPEND\n");
  writeFileSync(join(agent, "settings.json"), JSON.stringify({ privateSetting: true, "pi-browser-use": {privateProfile: "DO NOT DELETE PROFILE"}, packages: ["npm:pi-herdr-agents@3.3.1", "npm:private-example@1.2.3", "npm:@amaster.ai/pi-browser-use", {source: "npm:@amaster.ai/pi-browser-use@0.1.34", extensions: []}] }));
  writeFileSync(join(agent, "mcp.json"), JSON.stringify({ mcpServers: { "chrome": {command: "OLD CHROME"}, "jev-browser": { command: "PRIVATE EXISTING COMMAND" }, private: { command: "private-server" } } }));
  let result = deploy();
  assert.equal(result.status, 0, result.stderr);
  const installed = readFileSync(join(agent, "AGENTS.md"), "utf8");
  assert.ok(installed.startsWith(original));
  assert.ok(installed.includes(fallback.trim()));
  const settings = JSON.parse(readFileSync(join(agent, "settings.json"), "utf8"));
  assert.equal(settings.privateSetting, true);
  assert.ok(!("pi-browser-use" in settings));
  assert.deepEqual(settings.packages, ["npm:private-example@1.2.3", "npm:pi-workspace-history@0.5.2"]);
  const configured = JSON.parse(readFileSync(join(agent, "mcp.json"), "utf8")).mcpServers;
  assert.ok(!("jev-browser" in configured));
  assert.ok(!("chrome" in configured));
  assert.equal(configured.private.command, "private-server");
  assert.equal(configured["paper-search"].command, join(agent, "bin/paper-search-mcp"));
  assert.equal(deploy("1").status, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(agent, "mcp.json"), "utf8")).mcpServers, configured, "Pi-only mode must preserve existing MCP servers");
  unlinkSync(join(agent, "mcp.json"));
  assert.equal(deploy("1").status, 0);
  const piOnly = JSON.parse(readFileSync(join(agent, "mcp.json"), "utf8")).mcpServers;
  assert.ok(!("jev-browser" in piOnly));
  assert.ok(!("paper-search" in piOnly));
  assert.deepEqual(piOnly, {}, "Pi-only mode must not introduce missing private servers or browsers");
  assert.equal(readFileSync(join(agent, "APPEND_SYSTEM.md"), "utf8"), "PRIVATE APPEND\n");
  result = deploy();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(agent, "AGENTS.md"), "utf8"), installed, "Reinstall must be idempotent");
  const legacyFirstmate = firstmateSection.split(" После сжатия")[0];
  assert.notEqual(legacyFirstmate, firstmateSection, "Fixture must exercise the previously shipped policy");
  const previousProfile = original + "\n" + legacyFirstmate + "\n\n## Private section\n\nKEEP PRIVATE CONTENT\r\n";
  writeFileSync(join(agent, "AGENTS.md"), previousProfile);
  result = deploy();
  assert.equal(result.status, 0, result.stderr);
  const upgraded = readFileSync(join(agent, "AGENTS.md"), "utf8");
  assert.ok(upgraded.startsWith(previousProfile.replace(legacyFirstmate, firstmateSection)), "Only the exact legacy block changes; private CRLF bytes survive");
  assert.equal(upgraded.split(firstmateSection).length - 1, 1);
  assert.equal(upgraded.split(resourceSection).length - 1, 1);
  assert.equal(deploy().status, 0);
  assert.equal(readFileSync(join(agent, "AGENTS.md"), "utf8"), upgraded);
  const extendedConflict = original + "\n" + firstmateSection + "\nPRIVATE CONFLICT\n";
  writeFileSync(join(agent, "AGENTS.md"), extendedConflict);
  assert.notEqual(deploy().status, 0, "A matching prefix must not hide unknown managed-section content");
  assert.equal(readFileSync(join(agent, "AGENTS.md"), "utf8"), extendedConflict);
  const legacyConflict = original + "\n" + legacyFirstmate + "\n\n## Resource and effort limits\n\nPRIVATE CONFLICT\n";
  writeFileSync(join(agent, "AGENTS.md"), legacyConflict);
  assert.notEqual(deploy().status, 0, "Later conflicts must prevent partial legacy migration");
  assert.equal(readFileSync(join(agent, "AGENTS.md"), "utf8"), legacyConflict);
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
  unlinkSync(join(agent, "AGENTS.md"));
  const linkedTarget = join(agent, "private-target.md");
  writeFileSync(linkedTarget, original);
  symlinkSync(linkedTarget, join(agent, "AGENTS.md"));
  assert.notEqual(deploy().status, 0, "Linked AGENTS must remain refused");
  assert.equal(readFileSync(linkedTarget, "utf8"), original);
} finally {
  rmSync(agent, { recursive: true, force: true });
}
console.log("PASS portable Firstmate policy, private instructions, idempotence and conflict refusal");
