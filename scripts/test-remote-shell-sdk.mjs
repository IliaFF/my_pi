#!/usr/bin/env node
// Loopback SSH fixture exercises the actual package via Pi SDK, not a Windows emulator.
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { createRequire, findPackageJSON } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const modules = resolve(process.argv[2]);
const sandbox = mkdtempSync(join(tmpdir(), "pi-remote-shell-"));
const saved = Object.fromEntries(["HOME", "PI_CODING_AGENT_DIR", "SSH_AUTH_SOCK"].map(k => [k, process.env[k]]));
const sessions = [], servers = [], clients = new Set(), children = new Set();
const home = join(sandbox, "home"), agent = join(sandbox, "agent");
mkdirSync(home); mkdirSync(agent); mkdirSync(join(home, ".ssh"));
process.env.HOME = home; process.env.PI_CODING_AGENT_DIR = agent; delete process.env.SSH_AUTH_SOCK;
const key = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs1", format: "pem" });
const keyPath = join(home, ".ssh", "id_ed25519"); writeFileSync(keyPath, key, { mode: 0o600 });
const notices = [], commands = [], outputPaths = [];
let onHang;
let session;
try {
  const core = join(modules, "@earendil-works/pi-coding-agent/dist/index.js");
  const require = createRequire(core);
  const sshRequire = createRequire(join(modules, "pi-ssh-remote/package.json"));
  const { Server, utils } = sshRequire("ssh2");
  const net = require("node:net"), originalConnect = net.Socket.prototype.connect;
  // Allow only this process's loopback fixture ports; forbid provider/external sockets.
  net.Socket.prototype.connect = function (...args) {
    const options = args[0];
    assert.ok(options && typeof options === "object" && options.host === "127.0.0.1" && servers.some(s => s.address()?.port === options.port), "non-fixture network forbidden");
    return originalConnect.apply(this, args);
  };
  globalThis.fetch = async () => { throw new Error("External requests forbidden"); };
  const fingerprint = createHash("sha256").update(utils.parseKey(key).getPublicSSH()).digest("hex");
  async function fixture(shell) {
    const server = new Server({ hostKeys: [key] }, client => {
      clients.add(client); client.on("error", () => {}); client.on("close", () => clients.delete(client));
      client.on("authentication", ctx => ctx.method === "publickey" ? ctx.accept() : ctx.reject());
      client.on("ready", () => client.on("session", accept => {
        const channel = accept();
        channel.on("exec", (acceptExec, _reject, info) => {
          const stream = acceptExec(), command = info.command; commands.push({ shell, command });
          stream.on("error", () => {});
          const finish = (text, code = 0) => { stream.write(text); stream.exit(code); stream.end(); };
          if (shell === "posix") {
            const child = spawn("bash", ["-c", command], { cwd: sandbox, detached: true }); children.add(child);
            child.stdout.on("data", b => stream.write(b)); child.stderr.on("data", b => stream.stderr.write(b));
            child.on("close", code => { children.delete(child); stream.exit(code ?? 1); stream.end(); });
            stream.on("close", () => { try { process.kill(-child.pid, "SIGKILL"); } catch {} });
            return;
          }
          if (shell === "unsupported") return finish("unsupported shell\n", 1);
          if (shell === "overflow") return finish("x".repeat(70000));
          if (shell === "silent") return;
          if (command === "echo __PI_REMOTE_CMD__%OS%&& cd") return finish("__PI_REMOTE_CMD__Windows_NT\r\nC:\\Users\\fixture\r\n");
          if (/timeout|bash|pwd|cd --/.test(command)) return finish("Windows TIMEOUT: invalid syntax\r\n", 1);
          // Minimal cmd cwd fixture: reject unquoted/invalid directories and shell wrappers.
          const cd = /^cd \/d "([^"]+)" && ([\s\S]+)$/.exec(command);
          if (!cd) return finish("Unexpected Windows command\r\n", 1);
          if (cd[1].includes("missing")) return finish("The system cannot find the path specified\r\n", 1);
          let cwd = cd[1], body = cd[2];
          const second = /^cd \/d "([^"]+)" && cd$/.exec(body);
          if (second) {
            if (second[1].includes("missing")) return finish("Missing directory\r\n", 1);
            cwd = /^[A-Za-z]:\\/.test(second[1]) ? second[1] : `${cwd}\\${second[1]}`; body = "cd";
          }
          if (body === "cd") return finish(`${cwd}\r\n`);
          if (body === 'cmd.exe /c "whoami & hostname"') return finish("fixture\\user\r\nfixture\r\n");
          if (body === "hang") { onHang?.(); return; } // No exit: local waiting must end independently.
          if (body === "big-output") return finish(Array.from({ length: 800 }, (_, i) => `${i}: ${"x".repeat(80)}`).join("\n"));
          const exit = /^exit \/b (\d+)$/.exec(body);
          if (exit) return finish("fixture failure\r\n", Number(exit[1]));
          return finish("Unknown fixture command\r\n", 1);
        });
      }));
    });
    servers.push(server); await new Promise(r => server.listen(0, "127.0.0.1", r));
    const port = server.address().port;
    const knownFile = join(agent, "ssh-remote-known-hosts.json");
    let known = {}; try { known = JSON.parse(readFileSync(knownFile)); } catch {}
    known[`127.0.0.1:${port}`] = fingerprint; writeFileSync(knownFile, JSON.stringify(known));
    return `ssh -i ${keyPath} -p ${port} fixture@127.0.0.1`;
  }
  const windows = await fixture("cmd"), posix = await fixture("posix"), unsupported = await fixture("unsupported");
  const overflow = await fixture("overflow"), silent = await fixture("silent");
  const { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } = await import(pathToFileURL(core));
  const { fauxProvider, fauxAssistantMessage, fauxToolCall, InMemoryCredentialStore } = await import(pathToFileURL(join(dirname(findPackageJSON("@earendil-works/pi-ai", pathToFileURL(core))), "dist/index.js")));
  const { createJiti } = await import(pathToFileURL(join(dirname(core), "core/extensions/jiti-loader.js")));
  const jiti = createJiti(import.meta.url, { alias: { "@earendil-works/pi-coding-agent": core, "@sinclair/typebox": require.resolve("typebox"), "@earendil-works/pi-tui": require.resolve("@earendil-works/pi-tui") } });
  const remote = await jiti.import(join(modules, "pi-ssh-remote/index.ts"), { default: true });
  const runtime = await ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null, refreshOnCreate: false });
  const provider = fauxProvider({ provider: "offline-remote", api: "faux", models: [{ id: "fixture", name: "Fixture", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 64000, maxTokens: 1024 }] });
  runtime.registerNativeProvider(provider.provider);
  const settingsManager = SettingsManager.inMemory({ defaultTools: ["read", "write", "edit", "bash", "remote"], compaction: { enabled: false }, retry: { enabled: false } });
  const loader = new DefaultResourceLoader({ cwd: sandbox, agentDir: agent, settingsManager, noExtensions: true, noSkills: true, noThemes: true, noPromptTemplates: true, systemPrompt: "Offline remote regression.", extensionFactories: [remote] });
  await loader.reload(); assert.deepEqual(loader.getExtensions().errors, []);
  ({ session } = await createAgentSession({ cwd: sandbox, agentDir: agent, modelRuntime: runtime, model: provider.getModel(), thinkingLevel: "off", settingsManager, resourceLoader: loader, sessionManager: SessionManager.inMemory(sandbox) }));
  sessions.push(session);
  await session.bindExtensions({ uiContext: { notify: (text, level) => notices.push({ text, level }), confirm: async () => true, setStatus() {}, addAutocompleteProvider() {}, theme: { fg: (_color, text) => text } }, onError: e => { throw new Error(String(e)); } });
  let counter = 0, lastProviderContext;
  async function call(name, args) {
    provider.setResponses([ctx => { lastProviderContext = ctx; return fauxAssistantMessage([fauxToolCall(name, args)]); }, () => fauxAssistantMessage("Done")]);
    const start = session.messages.length;
    await session.prompt(`Fixture check ${++counter}`);
    const result = session.messages.slice(start).find(m => m.role === "toolResult" && m.toolName === name);
    assert.ok(result, `missing ${name} result`); return result;
  }
  const remoteCall = args => call("remote", args);
  const text = r => r.content.filter(c => c.type === "text").map(c => c.text).join("\n");
  const connected = await remoteCall({ action: "connect", command: windows });
  assert.ok(!connected.isError, `Windows connect failed: ${text(connected)}`);
  assert.equal(connected.details.toolRouting, "local"); assert.match(text(connected), /Windows|cmd/i);
  const identity = await remoteCall({ action: "exec", remoteCommand: 'cmd.exe /c "whoami & hostname"', timeout: 2 });
  assert.ok(!identity.isError, text(identity)); assert.match(text(identity), /fixture\\user\r?\nfixture/);
  const fallback = await remoteCall({ action: "connect", command: windows, cwd: 'D:\\missing' });
  assert.ok(!fallback.isError, text(fallback)); assert.equal(fallback.details.cwd, 'C:\\Users\\fixture');
  const spaced = 'D:\\Work Space';
  const changed = await remoteCall({ action: "chdir", cwd: spaced });
  assert.ok(!changed.isError, text(changed)); assert.equal(changed.details.cwd, spaced);
  const missing = await remoteCall({ action: "chdir", cwd: 'D:\\missing' });
  assert.ok(missing.isError); assert.equal((await remoteCall({ action: "status" })).details.cwd, spaced);
  for (const cwd of ['D:\\bad&echo injected', 'D:\\%PATH%', 'D:\\bad!name', 'D:\\bad"name', 'D:\\bad\nname', 'D:\\bad^name', 'D:\\bad(name)', 'D:\\bad|name', 'D:\\bad<name']) {
    const before = commands.length;
    const rejected = await remoteCall({ action: "exec", cwd, remoteCommand: "cd", timeout: 1 });
    assert.ok(rejected.isError, cwd); assert.equal(commands.length, before, "invalid cwd sent to SSH");
    assert.ok((await remoteCall({ action: "chdir", cwd })).isError);
    assert.equal(commands.length, before, "invalid chdir sent to SSH");
  }
  const invalidConnect = await remoteCall({ action: "connect", command: windows, cwd: 'D:\\%PATH%' });
  assert.ok(invalidConnect.isError); assert.match(text(invalidConnect), /Unsupported Windows cwd/);
  assert.equal((await remoteCall({ action: "status" })).details.cwd, spaced);
  const override = await remoteCall({ action: "exec", cwd: 'C:\\Other Space', remoteCommand: "cd", timeout: 2 });
  assert.ok(!override.isError, text(override)); assert.match(text(override), /C:\\Other Space/);
  assert.equal((await remoteCall({ action: "status" })).details.cwd, spaced, "exec override persisted cwd");
  const cdExec = await remoteCall({ action: "exec", remoteCommand: 'cd /d "C:\\Users\\fixture"', timeout: 2 });
  assert.ok(!cdExec.isError, text(cdExec)); assert.equal(cdExec.details.cwd, 'C:\\Users\\fixture');
  await session.prompt('/remote cd D:\\Work Space');
  assert.equal((await remoteCall({ action: "status" })).details.cwd, spaced);
  const printCwd = await remoteCall({ action: "exec", remoteCommand: "cd", timeout: 2 });
  assert.ok(!printCwd.isError, text(printCwd)); assert.equal(text(printCwd).trim(), spaced);
  await session.prompt('/remote exec --timeout 2 cd /d "C:\\Users\\fixture"');
  assert.equal((await remoteCall({ action: "status" })).details.cwd, 'C:\\Users\\fixture');
  assert.match(JSON.stringify(lastProviderContext), /Windows cmd.exe: read\/write\/edit\/bash remain local/);
  const offset = notices.length;
  await session.prompt('/remote exec --timeout 2 cmd.exe /c "whoami & hostname"');
  assert.ok(notices.slice(offset).some(n => n.level === "info" && /fixture\\user/.test(n.text)), JSON.stringify(notices.slice(offset)));
  for (const code of [7, 124, 137]) {
    const failed = await remoteCall({ action: "exec", remoteCommand: `exit /b ${code}`, timeout: 2 });
    assert.ok(failed.isError); assert.match(text(failed), new RegExp(`code ${code}`)); assert.doesNotMatch(text(failed), /timed out/i);
  }
  const started = performance.now();
  const expired = await remoteCall({ action: "exec", remoteCommand: "hang", timeout: 1 });
  assert.ok(expired.isError); assert.match(text(expired), /timed out after 1 seconds/);
  assert.ok(performance.now() - started < 4000, "Windows local timeout waited for remote close");
  const seenHang = new Promise(r => { onHang = r; });
  const cancelling = remoteCall({ action: "exec", remoteCommand: "hang", timeout: 20 });
  await seenHang; onHang = undefined;
  const abortStart = performance.now(); await session.abort();
  const aborted = await cancelling;
  assert.ok(aborted.isError); assert.match(text(aborted), /abort/i); assert.ok(performance.now() - abortStart < 3000);
  const big = await remoteCall({ action: "exec", remoteCommand: "big-output", timeout: 2 });
  assert.ok(!big.isError, text(big)); assert.ok(Buffer.byteLength(text(big)) < 10000); assert.ok(big.details.fullOutputPath);
  assert.equal(dirname(dirname(big.details.fullOutputPath)), tmpdir());
  assert.ok(basename(dirname(big.details.fullOutputPath)).startsWith("pi-ssh-remote-output-"));
  outputPaths.push(big.details.fullOutputPath); assert.match(readFileSync(big.details.fullOutputPath, "utf8"), /^0: /);
  // Standard tools must operate on this sandbox, without a remote filesystem/channel request.
  const requestCount = commands.length, localFile = join(sandbox, "local.txt");
  assert.ok(!(await call("write", { path: localFile, content: "local old\n" })).isError);
  assert.ok(!(await call("edit", { path: localFile, oldText: "old", newText: "new" })).isError);
  assert.match(text(await call("read", { path: localFile })), /local new/);
  const localShell = await call("bash", { command: "printf local-shell", timeout: 2 });
  assert.ok(!localShell.isError, text(localShell)); assert.match(text(localShell), /local-shell/);
  assert.equal(commands.length, requestCount, "Windows routed a standard tool remotely");
  const commandStart = commands.length;
  const reconnected = await remoteCall({ action: "reconnect" });
  assert.ok(!reconnected.isError, text(reconnected)); assert.equal(reconnected.details.toolRouting, "local");
  assert.ok(commands.slice(commandStart).some(c => c.command.startsWith("echo __PI_REMOTE_CMD__")), "reconnect skipped shell probe");
  const windowsCommands = commands.filter(c => c.shell === "cmd");
  assert.ok(!windowsCommands.some(c => /timeout --|bash -lc|pwd -P|cd --/.test(c.command)), "Windows received POSIX commands");
  await remoteCall({ action: "disconnect" });
  const unknown = await remoteCall({ action: "connect", command: unsupported });
  assert.ok(unknown.isError); assert.match(text(unknown), /Unsupported remote shell/);
  assert.equal((await remoteCall({ action: "status" })).details.connected, false);
  const excessive = await remoteCall({ action: "connect", command: overflow });
  assert.ok(excessive.isError); assert.match(text(excessive), /exceeds 64KiB/);
  const probeStart = performance.now();
  const noResponse = await remoteCall({ action: "connect", command: silent });
  assert.ok(noResponse.isError); assert.match(text(noResponse), /timed out after 5 seconds/);
  assert.ok(performance.now() - probeStart < 8000);
  const unix = await remoteCall({ action: "connect", command: posix });
  assert.ok(!unix.isError, text(unix)); assert.equal(unix.details.toolRouting, "remote");
  const unixDir = join(sandbox, "Unix space's directory"); mkdirSync(unixDir);
  assert.ok(!(await remoteCall({ action: "chdir", cwd: unixDir })).isError);
  const unixCwd = await remoteCall({ action: "exec", remoteCommand: "pwd -P", timeout: 2 });
  assert.ok(!unixCwd.isError, text(unixCwd)); assert.equal(text(unixCwd).trim(), unixDir);
  const posixTimeout = await remoteCall({ action: "exec", remoteCommand: "sleep 5", timeout: 1 });
  assert.ok(posixTimeout.isError); assert.match(text(posixTimeout), /timed out/);
  const routed = await call("bash", { command: "pwd -P", timeout: 2 });
  assert.ok(!routed.isError, text(routed)); assert.match(text(routed), /Unix space's directory/);
  await remoteCall({ action: "disconnect" });
  const restored = await remoteCall({ action: "reconnect" });
  assert.ok(!restored.isError, text(restored)); assert.equal(restored.details.toolRouting, "remote");
  console.log("PASS real package / Pi SDK / loopback SSH: Windows connect/cwd/chdir/exec/reconnect; quoting rejection; errors/124/137; deadline/abort; output limits; standard tools local; unsupported shell; POSIX routing/cwd/timeout");
} finally {
  // Dispose fires session_shutdown; explicitly disconnect first to avoid reconnect-on-close.
  if (session) { try { await session.prompt("/remote disconnect"); } catch {} }
  for (const session of sessions) session.dispose();
  for (const client of clients) client.end();
  for (const child of children) { try { process.kill(-child.pid, "SIGKILL"); } catch {} }
  await Promise.all(servers.map(s => new Promise(r => s.close(r))));
  for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  for (const path of outputPaths) rmSync(dirname(path), { recursive: true, force: true });
  rmSync(sandbox, { recursive: true, force: true });
}
