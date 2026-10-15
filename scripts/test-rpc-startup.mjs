#!/usr/bin/env node
// Real CLI + configured extensions; no prompt, credentials, MCP transports or model request.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const agent = resolve(process.argv[2]);
const core = join(agent, "npm/node_modules/@earendil-works/pi-coding-agent");
const { RpcClient } = await import(pathToFileURL(join(core, "dist/index.js")));
const pkg = JSON.parse(readFileSync(join(core, "package.json"), "utf8"));
const client = new RpcClient({ cliPath: join(core, pkg.bin.pi), cwd: agent,
  env: { PI_CODING_AGENT_DIR: agent, PI_OFFLINE: "1",
    NODE_OPTIONS: `--unhandled-rejections=strict --require=${resolve("scripts/no-network.cjs")}` },
  args: ["--no-session", "--offline"] });
const errors = [];
client.onEvent((event) => {
  if (event.type === "extension_error" || event.type === "agent_start") errors.push(event);
});
try {
  await client.start();
  const state = await client.getState();
  assert.equal(state.isStreaming, false);
  const commands = await client.getCommands();
  for (const name of ["queue", "auto-ultra-compact-status", "ponytail", "pace"]) {
    assert.ok(commands.some((command) => command.name === name), `missing command: ${name}`);
  }
  for (const name of ["reader-pane-on", "reader-pane-off", "reader-pane-status", "fast", "caveman"]) {
    assert.ok(!commands.some((command) => command.name === name), `removed command still registered: ${name}`);
  }
  assert.deepEqual(errors, [], "startup must not emit extension errors or start a model run");
  assert.doesNotMatch(client.getStderr(), /Failed to load extension|Error loading extension|NETWORK_BLOCKED|Extension conflicts/i);
  console.log(`PASS RPC startup: ${commands.length} commands, configured extensions, no prompt/model run`);
} finally {
  await client.stop();
}
