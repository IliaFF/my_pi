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
writeFileSync(probe, `export default pi => {
  pi.on('session_start', () => {
    globalThis.fetch = async (url, options) => {
      if (!String(url).endsWith('/endpoints')) throw new Error('Unexpected network request');
      if (!options.headers.authorization?.startsWith('Bearer ')) throw new Error('Authorization missing');
      const endpoint = (tag, quantization, cache) => ({tag, status: 0, quantization, max_completion_tokens: 65536, pricing: {input_cache_read: cache, prompt: '0.0000001', completion: '0.0000004'}, throughput_last_30m: {p50: 51}});
      return { ok: true, json: async () => ({data: {endpoints: [endpoint('probe-a/fp8', 'fp8', '0.000000002'), endpoint('probe-b/fp8', 'fp8', '0.000000003'), {tag: 'excluded/fp4', status: 0, quantization: 'fp4', pricing: {}}]}}) };
    };
  });
  pi.registerCommand('probe-route', {
    description: 'Report session route',
    handler: async (args, ctx) => pi.appendEntry('probe-route', {route: ctx.model?.compat?.openRouterRouting ?? null}),
  });
};`);
const client = new RpcClient({ cliPath: cli, cwd: work, env: { PI_OFFLINE: "1" }, args: ["--no-session", "--offline", "--no-mcp", "-e", probe] });
const entries = [];
const routes = [];
const errors = [];
client.onEvent((event) => {
  if (event.type === "entry_appended" && event.entry?.customType === "openrouter-providers") entries.push(event.entry);
  if (event.type === "entry_appended" && event.entry?.customType === "probe-route") routes.push(event.entry.data.route);
  if (event.type === "extension_error") errors.push(event);
});
try {
  await client.start();
  const commands = await client.getCommands();
  assert.ok(commands.some((command) => command.name === "providers"), "/providers missing");
  const before = await client.getMessages();

  assert.equal(await client.prompt("/probe-route"), "handled");
  const baseline = routes.at(-1);
  assert.ok(Array.isArray(baseline.order) && baseline.order.length > 0, "config route missing");

  const disposition = await client.prompt("/providers");
  assert.equal(disposition, "handled");
  assert.equal(entries.length, 1);
  assert.match(entries[0].data.text, /probe-a\/fp8/);
  assert.match(entries[0].data.text, /51\.0/);
  assert.doesNotMatch(entries[0].data.text, /excluded\/fp4/);
  assert.equal(await client.prompt("/providers all"), "handled");
  assert.equal(entries.length, 2);
  assert.match(entries[1].data.text, /excluded\/fp4/);
  assert.equal(routes.length, 1, "Plain table changed the route");

  assert.equal(await client.prompt("/providers use probe-a/fp8"), "handled");
  assert.match(entries.at(-1).data.text, /^Выбран в сессии: probe-a\/fp8 · order \[probe-a\/fp8\] · allow_fallbacks false/);
  assert.match(entries.at(-1).data.text, /\nprobe-a\/fp8 +[^\n]*основной/);
  assert.equal(await client.prompt("/probe-route"), "handled");
  assert.deepEqual(routes.at(-1).order, ["probe-a/fp8"]);
  assert.equal(routes.at(-1).allow_fallbacks, false);
  assert.deepEqual(routes.at(-1).quantizations, baseline.quantizations);

  assert.equal(await client.prompt("/providers use excluded/fp4"), "handled");
  assert.match(entries.at(-1).data.text, /вне списка/);
  assert.equal(await client.prompt("/providers use missing/fp8"), "handled");
  assert.match(entries.at(-1).data.text, /не найден/);
  assert.equal(await client.prompt("/providers use"), "handled");
  assert.match(entries.at(-1).data.text, /Использование/);
  assert.equal(await client.prompt("/providers bogus"), "handled");
  assert.match(entries.at(-1).data.text, /Использование/);
  assert.equal(await client.prompt("/probe-route"), "handled");
  assert.deepEqual(routes.at(-1).order, ["probe-a/fp8"], "Rejected command changed the route");

  assert.equal(await client.prompt("/providers reset"), "handled");
  assert.match(entries.at(-1).data.text, /^Маршрут из models\.json: /);
  const listed = entries.at(-1).data.text.replace(/^Маршрут из models\.json: /, "");
  assert.equal(await client.prompt("/probe-route"), "handled");
  assert.deepEqual(routes.at(-1).order, baseline.order);
  assert.equal(routes.at(-1).order.join(", "), listed);

  assert.deepEqual(await client.getMessages(), before, "Table leaked into model messages");
  assert.deepEqual(errors, []);
  assert.doesNotMatch(client.getStderr(), /Failed to load extension|Error loading extension/i);
  console.log("PASS /providers: registration, dispatch, table entry, session pin, rejection paths, reset, no context pollution");
} finally {
  await client.stop();
  rmSync(work, { recursive: true, force: true });
}
