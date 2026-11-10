#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";

const root = resolve(new URL("..", import.meta.url).pathname);
const installer = readFileSync(join(root, "install.sh"), "utf8");
const fixture = JSON.parse(readFileSync(join(root, "tests/fixtures/retired-profile.json"), "utf8"));
const registry = JSON.parse(readFileSync(join(root, "configs/retired-profile.json"), "utf8"));
const config = installer.slice(installer.indexOf("# Personal configuration start"), installer.indexOf("# Personal configuration end"));
const backupBlock = installer.slice(installer.indexOf("managed=("), installer.indexOf("core_changed=0"));
const preflight = installer.match(/^node "\$ROOT\/scripts\/migrate-retired-profile.mjs" "\$AGENT_DIR" --check$/m)?.[0] ?? ":";
const apply = installer.match(/^node "\$ROOT\/scripts\/migrate-retired-profile.mjs" "\$AGENT_DIR" --apply "\$backup"$/m)?.[0]
  ?? installer.match(/^rm -rf "\$AGENT_DIR\/extensions\/subagent".*\nrm -f .*herdr-agent-state.ts"/m)?.[0];
assert.ok(apply, "Installer must have an actual migration block");

function sandbox(t) {
  const temp = mkdtempSync(join(tmpdir(), "pi-migration-test-"));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const agent = join(temp, "agent");
  mkdirSync(agent);
  return { temp, agent, backups: join(temp, "backups") };
}

function put(agent, name, text) {
  const path = join(agent, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

function shell(env, script, preserve = "1") {
  return spawnSync("bash", ["-euc", script], {
    env: { ...process.env, ROOT: root, AGENT_DIR: env.agent, BACKUP_ROOT: env.backups,
      CONTEXT_SETTINGS: join(env.agent, "my-pi-settings.json"), PRESERVE_SETTINGS: preserve, SKIP_STACK: "1" },
    encoding: "utf8", timeout: 15000,
  });
}

function oldProfile(agent) {
  for (const [name, text] of Object.entries(fixture.files)) put(agent, name, text);
  const append = "# Private before\r\n\r\nKEEP BEFORE\r\n\r\n" + fixture.section.replaceAll("\n", "\r\n") + "\r\n\r\n# Private after\r\n\r\nKEEP AFTER\r\n";
  put(agent, "APPEND_SYSTEM.md", append);
  put(agent, "settings.json", JSON.stringify({ privateValue: 42, subagents: { old: true }, packages: ["npm:pi-subagents@0.87.0", "npm:custom-plugin@1.0.0"] }));
  put(agent, "herdr-agents/private.txt", "KEEP NEIGHBOR");
  put(agent, "extensions/subagent/private.txt", "KEEP OTHER NEIGHBOR");
  return append;
}

test("fixtures match actual historical hashes and policy sections", () => {
  for (const [name, text] of Object.entries(fixture.files)) {
    assert.ok(registry.files[name].includes(createHash("sha256").update(text).digest("hex")), name);
  }
  assert.ok(registry.sections.includes(fixture.section));
});

for (const preserve of ["0", "1"]) {
  test(`linked APPEND refuses before any config writes, preserve=${preserve}`, t => {
    const env = sandbox(t), target = join(env.temp, "outside.md");
    writeFileSync(target, "PRIVATE OUTSIDE");
    symlinkSync(target, join(env.agent, "APPEND_SYSTEM.md"));
    const result = shell(env, preflight + "\n" + config, preserve);
    assert.notEqual(result.status, 0, "Linked APPEND was accepted");
    assert.equal(readFileSync(target, "utf8"), "PRIVATE OUTSIDE");
    assert.equal(existsSync(join(env.agent, "settings.json")), false);
  });
}

test("linked profile ancestor refuses without external writes", t => {
  const env = sandbox(t), outside = join(env.temp, "outside");
  mkdirSync(outside);
  const linked = join(env.temp, "linked");
  symlinkSync(outside, linked);
  const result = shell({ ...env, agent: join(linked, "profile") }, preflight);
  assert.notEqual(result.status, 0, "Linked profile parent was accepted");
  assert.deepEqual(readdirSync(outside), []);
});

test("known migration removes only legacy sections/files and is idempotent", t => {
  const env = sandbox(t);
  const before = oldProfile(env.agent);
  const result = shell(env, preflight + "\ncurrent_version=1.5.0\n" + backupBlock + "\n" + apply + "\n" + config);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(readFileSync(join(env.agent, "APPEND_SYSTEM.md"), "utf8"), before.replace(fixture.section.replaceAll("\n", "\r\n") + "\r\n\r\n", ""));
  for (const name of Object.keys(fixture.files)) assert.equal(existsSync(join(env.agent, name)), false, name);
  assert.equal(readFileSync(join(env.agent, "herdr-agents/private.txt"), "utf8"), "KEEP NEIGHBOR");
  assert.equal(readFileSync(join(env.agent, "extensions/subagent/private.txt"), "utf8"), "KEEP OTHER NEIGHBOR");
  const settings = JSON.parse(readFileSync(join(env.agent, "settings.json"), "utf8"));
  assert.ok(!("subagents" in settings));
  assert.equal(settings.privateValue, 42);
  assert.ok(settings.packages.includes("npm:custom-plugin@1.0.0"));
  const after = readFileSync(join(env.agent, "APPEND_SYSTEM.md"));
  const backup = join(env.backups, readdirSync(env.backups)[0]);
  const repeat = shell(env, preflight + `\nbackup='${backup}'\n` + apply + "\n" + config);
  assert.equal(repeat.status, 0, repeat.stdout + repeat.stderr);
  assert.deepEqual(readFileSync(join(env.agent, "APPEND_SYSTEM.md")), after);
});

test("actual backup and uninstall restore every changed legacy file", t => {
  const env = sandbox(t);
  const append = oldProfile(env.agent);
  const files = { ...fixture.files, "extensions/herdr-agent-state.ts": "SAVED STATE HOOK" };
  put(env.agent, "extensions/herdr-agent-state.ts", files["extensions/herdr-agent-state.ts"]);
  const result = shell(env, "current_version=1.5.0\n" + backupBlock);
  assert.equal(result.status, 0, result.stderr);
  const backup = join(env.backups, readdirSync(env.backups)[0]);
  for (const name of Object.keys(files)) rmSync(join(env.agent, name));
  writeFileSync(join(env.agent, "APPEND_SYSTEM.md"), "CHANGED");
  const restored = spawnSync("bash", [join(root, "uninstall.sh"), "--backup", backup], {
    env: { ...process.env, PI_CODING_AGENT_DIR: env.agent }, encoding: "utf8", timeout: 15000,
  });
  assert.equal(restored.status, 0, restored.stdout + restored.stderr);
  for (const [name, text] of Object.entries(files)) assert.equal(readFileSync(join(env.agent, name), "utf8"), text, name);
  assert.equal(readFileSync(join(env.agent, "APPEND_SYSTEM.md"), "utf8"), append);
  assert.equal(readFileSync(join(env.agent, "herdr-agents/private.txt"), "utf8"), "KEEP NEIGHBOR");
});

for (const kind of ["modified file", "unknown Jev file", "modified section", "modified heading", "linked target", "special file"]) {
  test(`${kind} refuses before mutation`, t => {
    const env = sandbox(t);
    const append = oldProfile(env.agent);
    if (kind === "modified file") put(env.agent, "agents/terminal.md", "PRIVATE MODIFIED ROLE");
    if (kind === "unknown Jev file") put(env.agent, "extensions/jev-review/private.txt", "KEEP UNKNOWN");
    if (kind === "modified section") put(env.agent, "APPEND_SYSTEM.md", append.replace("# Long-lived delegation", "# Long-lived delegation\r\nPRIVATE ADDITION"));
    if (kind === "modified heading") put(env.agent, "APPEND_SYSTEM.md", append.replace("# Long-lived delegation", "# Long-lived delegation changed"));
    if (kind === "linked target") {
      rmSync(join(env.agent, "agents/terminal.md"));
      symlinkSync(join(env.agent, "APPEND_SYSTEM.md"), join(env.agent, "agents/terminal.md"));
    }
    if (kind === "special file") {
      const fifo = spawnSync("mkfifo", [join(env.agent, "extensions/jev-review/pipe")], { timeout: 5000 });
      assert.equal(fifo.status, 0);
    }
    const before = readFileSync(join(env.agent, "APPEND_SYSTEM.md"));
    const result = shell(env, preflight);
    assert.notEqual(result.status, 0, `${kind} was accepted`);
    assert.deepEqual(readFileSync(join(env.agent, "APPEND_SYSTEM.md")), before);
    assert.equal(existsSync(env.backups), false);
    assert.equal(lstatSync(join(env.agent, "extensions/subagent/config.json")).isFile(), true);
  });
}

test("real APPEND manifest entry prevents private snapshot capture", t => {
  const env = sandbox(t);
  const source = join(env.temp, "source");
  mkdirSync(join(source, "configs"), { recursive: true });
  put(source, "configs/APPEND_SYSTEM.md", "PUBLIC BASELINE");
  put(env.agent, "APPEND_SYSTEM.md", "PRIVATE HOST POLICY");
  const entry = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")).managedConfigs.find(item => item.source === "APPEND_SYSTEM.md");
  put(source, "manifest.json", JSON.stringify({ managedConfigs: [entry] }));
  const result = spawnSync("python3", ["-B", "-c", `import importlib.util, pathlib, sys
spec = importlib.util.spec_from_file_location('migration_snapshot', sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.BASE = pathlib.Path(sys.argv[2])
module.MANIFEST_PATH = module.BASE / 'manifest.json'
module.AGENT_DIR = pathlib.Path(sys.argv[3])
raise SystemExit(module.snapshot())`, join(root, "scripts/maintenance.py"), source, env.agent], { encoding: "utf8", timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(source, "configs/APPEND_SYSTEM.md"), "utf8"), "PUBLIC BASELINE");
});

test("default settings and policy spec do not retain retired promises", () => {
  const defaults = JSON.parse(readFileSync(join(root, "configs/settings.json"), "utf8"));
  for (const key of ["readseek", "thresholds", "cooldownMs", "subagents"]) assert.ok(!(key in defaults), key);
  const spec = readFileSync(join(root, "openspec/specs/general-agent-policy/spec.md"), "utf8");
  assert.ok(!spec.includes("### Requirement: Agent launches need explicit reauthorization"));
});
