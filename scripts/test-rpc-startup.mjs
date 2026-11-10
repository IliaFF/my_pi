#!/usr/bin/env node
// Real CLI + configured extensions; no prompt, credentials, MCP transports or model request.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const agent = resolve(process.argv[2]);
const settings = JSON.parse(readFileSync(join(agent, 'settings.json'), 'utf8'));
const core = join(agent, "npm/node_modules/@earendil-works/pi-coding-agent");
const { RpcClient } = await import(pathToFileURL(join(core, "dist/index.js")));
const pkg = JSON.parse(readFileSync(join(core, "package.json"), "utf8"));
const probe = mkdtempSync(join(tmpdir(), 'pi-rpc-no-agent-runners-'));
const probeFile = join(probe, 'probe.mjs');
writeFileSync(probeFile, `export default pi => pi.on('session_start', () => {
  const retired = ['subagent', 'subagent_send', 'subagents_list', 'subagent_resume'];
  const found = pi.getAllTools().map(tool => tool.name).filter(name => retired.includes(name));
  if (found.length > 0) throw new Error('Retired agent runner tools registered: ' + found.join(', '));
  process.stderr.write('AGENT_RUNNERS_ABSENT\\n');
});`);
const client = new RpcClient({ cliPath: join(core, pkg.bin.pi), cwd: resolve(process.argv[3] ?? agent),
  env: { PI_CODING_AGENT_DIR: agent, PI_OFFLINE: "1",
    NODE_OPTIONS: `--unhandled-rejections=strict --require=${resolve("scripts/no-network.cjs")}` },
  args: ["--no-session", "--offline", "--no-mcp", "-e", probeFile] });
const errors = [];
client.onEvent((event) => {
  if (event.type === "extension_error" || event.type === "agent_start") errors.push(event);
});
try {
  await client.start();
  const state = await client.getState();
  assert.equal(state.isStreaming, false);
  const commands = await client.getCommands();
  assert.ok(!commands.some(command => command.name === 'council'), 'council must be excluded');
  for (const retired of ['npm:pi-subagents', 'npm:pi-herdr-agents']) {
    assert.ok(!settings.packages.some(p => (typeof p === 'string' ? p : p.source).startsWith(retired)), `retired package must not activate: ${retired}`);
  }
  assert.ok(!settings.subagents, 'retired subagent model restrictions must be absent');
  for (const name of ["queue", "auto-ultra-compact-status", "ponytail", "pace", "bg", "jobs", "logs", "kill", "tasks", "history-status"]) {
    assert.ok(commands.some((command) => command.name === name), `missing command: ${name}`);
  }
  assert.equal(commands.find(command => command.name === "history-status").sourceInfo?.source, "npm:pi-workspace-history@0.5.2", "workspace history must load from the approved package");
  for (const name of ["bg", "jobs", "logs", "kill", "tasks"]) {
    assert.equal(commands.find(command => command.name === name).sourceInfo?.source, "npm:pi-background-tasks@2.6.10", `wrong background command owner: ${name}`);
  }
  for (const name of ["reader-pane-on", "reader-pane-off", "reader-pane-status", "fast", "caveman", "fusion", "fusion-model", "bg-update", "subagent", "subagents-init", "worktree"]) {
    assert.ok(!commands.some((command) => command.name === name), `removed command still registered: ${name}`);
  }
  assert.deepEqual(errors, [], "startup must not emit extension errors or start a model run");
  assert.match(client.getStderr(), /AGENT_RUNNERS_ABSENT/, 'real RPC session_start must see no agent runner tool');
  assert.doesNotMatch(client.getStderr(), /Failed to load extension|Error loading extension|NETWORK_BLOCKED|Extension conflicts/i);
  console.log(`PASS RPC startup: ${commands.length} commands, configured extensions without agent runners (builtins/council disabled), no prompt/model run`);
} finally {
  await client.stop();
  rmSync(probe, { recursive: true, force: true });
}
