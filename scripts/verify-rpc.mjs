// Real CLI check of the installed profile: no prompt, credentials or model request.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const agent = resolve(process.argv[2] ?? join(process.env.HOME ?? "", ".pi/agent"));
const core = join(agent, "npm/node_modules/@earendil-works/pi-coding-agent");
const { RpcClient } = await import(pathToFileURL(join(core, "dist/index.js")).href);
const pkg = JSON.parse(readFileSync(join(core, "package.json"), "utf8"));
const probe = mkdtempSync(join(tmpdir(), "clean-pi-rpc-"));
const probeFile = join(probe, "probe.mjs");
writeFileSync(probeFile, `export default pi => pi.on('session_start', () => {
  const tools = pi.getAllTools().map(tool => tool.name);
  if (!tools.includes('remote')) throw new Error('remote tool missing: ' + tools.join(','));
  process.stderr.write('REMOTE_PRESENT\\n');
});`);

const client = new RpcClient({ cliPath: join(core, pkg.bin.pi), cwd: probe,
  env: { PI_CODING_AGENT_DIR: agent, PI_OFFLINE: "1" },
  args: ["--no-session", "--offline", "--no-mcp", "-e", probeFile] });
const errors = [];
client.onEvent(event => { if (event.type === "extension_error") errors.push(event); });
try {
  await client.start();
  const state = await client.getState();
  assert.equal(state.isStreaming, false);
  const commands = await client.getCommands();
  assert.ok(commands.some(command => command.name === "remote"), "remote command missing");
  const installed = ["remote", "auto-ultra-compact-status", "context-fold", "ponytail", "bg",
    "skill:cpp-styleguide", "skill:latex-simple-style", "skill:writing-python", "skill:remote-hosts"];
  const absent = installed.filter(name => !commands.some(command => command.name === name));
  assert.deepEqual(absent, [], "installed extensions are not registered: " + absent.join(","));
  const retired = ["queue", "fast", "caveman", "worktree", "profile"];
  const leaked = commands.filter(command => retired.includes(command.name)).map(command => command.name);
  assert.deepEqual(leaked, [], "removed extension commands are still registered");
  assert.deepEqual(errors, [], "startup must not emit extension errors");
  assert.match(client.getStderr(), /REMOTE_PRESENT/, "real session_start must expose the remote tool");
  assert.doesNotMatch(client.getStderr(), /Failed to load extension|Error loading extension/i);
  console.log(`PASS installed profile: ${commands.length} commands, remote tool, compaction and fold extensions present, no retired extensions, no model run`);
} finally {
  await client.stop();
  rmSync(probe, { recursive: true, force: true });
}
