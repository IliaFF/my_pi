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
const probe = mkdtempSync(join(tmpdir(), 'pi-rpc-terminal-'));
const probeFile = join(probe, 'probe.mjs');
writeFileSync(probeFile, `export default pi => pi.on('session_start', () => {
  if (!pi.getAllTools().some(tool => tool.name === 'subagent')) throw new Error('Terminal extension tool missing');
  if (!pi.getActiveTools().includes('subagent')) throw new Error('Terminal extension tool inactive');
  process.stderr.write('TERMINAL_EXTENSION_LOADED\\n');
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
  assert.deepEqual(settings.packages.filter(p => typeof p !== 'string' && p.source === 'npm:pi-subagents@0.87.0'),
    [{ source: 'npm:pi-subagents@0.87.0', skills: [], prompts: [] }], 'pinned extension only, no bundled prompts/skills');
  assert.equal(settings.subagents.disableBuiltins, true);
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
  assert.match(client.getStderr(), /TERMINAL_EXTENSION_LOADED/, 'real RPC session_start must see the subagent tool');
  assert.doesNotMatch(client.getStderr(), /Failed to load extension|Error loading extension|NETWORK_BLOCKED|Extension conflicts/i);
  console.log(`PASS RPC startup: ${commands.length} commands, configured extensions including pinned terminal subagent (builtins/council disabled), no prompt/model run`);
} finally {
  await client.stop();
  rmSync(probe, { recursive: true, force: true });
}
