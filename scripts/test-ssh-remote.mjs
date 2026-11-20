// Exercise the rebased cmd path and upstream cancellation without an SSH host.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const modules = resolve(process.argv[2]);
const { createJiti } = await import(pathToFileURL(join(modules, "@earendil-works/pi-coding-agent/dist/core/extensions/jiti-loader.js")).href);
const pkg = join(modules, "pi-ssh-remote");
const temp = mkdtempSync(join(dirname(modules), "ssh-probe-"));
try {
  symlinkSync(join(pkg, "src"), join(temp, "src"), "dir");
  const probe = join(temp, "probe.ts");
  writeFileSync(probe, readFileSync(join(pkg, "index.ts"), "utf8") + "\nexport { commandInDirectory, execRemoteLimited };\n");
  const { commandInDirectory, execRemoteLimited } = await createJiti(import.meta.url).import(probe);
  const cwd = "C:\\Test Folder";
  const cmd = commandInDirectory({ shell: "cmd", home: cwd }, cwd, "echo ok");
  assert.equal(cmd, 'cd /d "C:\\Test Folder" && echo ok');
  assert.throws(() => commandInDirectory({ shell: "cmd" }, "C:\\A&B", "echo ok"), /Unsupported Windows cwd/);

  const fake = () => {
    const stream = Object.assign(new EventEmitter(), { stderr: new EventEmitter(), close() { this.closed = true; } });
    const client = { exec(command, ready) { this.command = command; ready(null, stream); } };
    return { client, stream };
  };
  const { client, stream } = fake();
  const result = execRemoteLimited(client, cmd, 1, 10, 4096, "cmd");
  await new Promise(setImmediate);
  assert.equal(client.command, cmd);
  stream.emit("data", Buffer.from("ok\n"));
  stream.emit("close", 0);
  assert.match((await result).content, /ok/);

  const timeout = fake();
  await assert.rejects(execRemoteLimited(timeout.client, cmd, 0.01, 10, 4096, "cmd"), /timed out/);
  assert.equal(timeout.stream.closed, true);
  const posix = fake();
  const controller = new AbortController();
  const pending = execRemoteLimited(posix.client, "echo ok", 1, 10, 4096, "posix", controller.signal);
  await new Promise(setImmediate);
  assert.match(posix.client.command, /^timeout /);
  controller.abort();
  await assert.rejects(pending, /aborted/);
  assert.equal(posix.stream.closed, true);
  console.log("PASS SSH stub: cmd quoting, output, local timeout and POSIX abort");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
