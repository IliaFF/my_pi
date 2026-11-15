import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const cli = realpathSync(execFileSync("which", ["pi"], { encoding: "utf8" }).trim());
const { RpcClient } = await import(pathToFileURL(join(dirname(cli), "../index.js")).href);
const work = mkdtempSync(join(tmpdir(), "providers-command-"));
const probe = join(work, "mock.ts");
writeFileSync(probe, `export default pi => pi.on('session_start', () => {
  globalThis.fetch = async (url, options) => {
    if (!String(url).endsWith('/endpoints')) throw new Error('Unexpected network request');
    if (!options.headers.authorization?.startsWith('Bearer ')) throw new Error('Authorization missing');
    return { ok: true, json: async () => ({data: {endpoints: [{tag: 'probe/fp8', status: 0, quantization: 'fp8', max_completion_tokens: 65536, pricing: {input_cache_read: '0.000000002', prompt: '0.0000001', completion: '0.0000004'}, throughput_last_30m: {p50: 51}}, {tag: 'excluded/fp4', status: 0, quantization: 'fp4', pricing: {}}]}}) };
  };
});`);
const client = new RpcClient({ cliPath: cli, cwd: work, env: { PI_OFFLINE: "1" }, args: ["--no-session", "--offline", "--no-mcp", "-e", probe] });
const entries = [];
const errors = [];
client.onEvent((event) => {
  if (event.type === "entry_appended" && event.entry?.customType === "openrouter-providers") entries.push(event.entry);
  if (event.type === "extension_error") errors.push(event);
});
try {
  await client.start();
  const commands = await client.getCommands();
  assert.ok(commands.some((command) => command.name === "providers"), "/providers missing");
  const before = await client.getMessages();
  const disposition = await client.prompt("/providers");
  assert.equal(disposition, "handled");
  assert.equal(entries.length, 1);
  assert.match(entries[0].data.text, /probe\/fp8/);
  assert.match(entries[0].data.text, /51\.0/);
  assert.doesNotMatch(entries[0].data.text, /excluded\/fp4/);
  assert.equal(await client.prompt("/providers all"), "handled");
  assert.equal(entries.length, 2);
  assert.match(entries[1].data.text, /excluded\/fp4/);
  assert.deepEqual(await client.getMessages(), before, "Table leaked into model messages");
  assert.deepEqual(errors, []);
  assert.doesNotMatch(client.getStderr(), /Failed to load extension|Error loading extension/i);
  console.log("PASS /providers: global registration, command dispatch, table entry, no model call or context pollution");
} finally {
  await client.stop();
  rmSync(work, { recursive: true, force: true });
}
