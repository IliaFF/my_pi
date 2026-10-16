// Operator-only OAuth setup. No model calls, API keys or token output.
import { randomUUID } from "node:crypto";
import { chmodSync, closeSync, existsSync, fsyncSync, mkdirSync, mkdtempSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

export function saveCredential(credential, path) {
  assert.equal(credential.type, "oauth");
  for (const field of ["access", "refresh", "clientId"]) assert.ok(typeof credential[field] === "string" && credential[field].length > 0);
  assert.ok(Number.isFinite(credential.expires) && credential.expires > Date.now());
  assert.ok(Array.isArray(credential.scopes) && credential.scopes.every(s => typeof s === "string") && credential.scopes.includes("chatgpt.tokens.use.direct"));
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = path + ".tmp";
  const fd = openSync(temporary, "w", 0o600);
  try {
    chmodSync(temporary, 0o600);
    writeFileSync(fd, JSON.stringify({ openai: credential }, null, 2) + "\n");
    fsyncSync(fd);
  } finally { closeSync(fd); }
  renameSync(temporary, path);
}

function selfCheck() {
  const directory = mkdtempSync(join(tmpdir(), "my-pi-oauth-test-"));
  try {
    const path = join(directory, "auth.json");
    const good = { type: "oauth", access: "fixture-access", refresh: "fixture-refresh", clientId: "fixture-client", expires: Date.now() + 3600000, scopes: ["chatgpt.tokens.use.direct"] };
    saveCredential(good, path);
    const saved = readFileSync(path, "utf8");
    assert.deepEqual(JSON.parse(saved), { openai: good });
    for (const patch of [{ type: "api_key" }, { scopes: [] }, { clientId: "" }, { expires: 0 }]) {
      assert.throws(() => saveCredential({ ...good, ...patch }, path));
      assert.equal(readFileSync(path, "utf8"), saved);
    }
    console.log("PASS OAuth-only validation, atomic save, old credential preserved on rejection");
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

async function login() {
  const config = JSON.parse(readFileSync("/etc/my-pi-updater/config.json", "utf8"));
  const deviceFile = join(config.auth_home, "device-id");
  if (!existsSync(deviceFile)) writeFileSync(deviceFile, randomUUID(), { mode: 0o600, flag: "wx" });
  // Installed inside runtime/, so this resolves its pinned public SDK provider.
  const { openaiProvider } = await import("@earendil-works/pi-ai/providers/openai");
  const signal = AbortSignal.timeout(14 * 60 * 1000);
  const credential = await openaiProvider().auth.oauth.login({
    signal,
    notify(event) {
      if (event.type === "auth_url") {
        const url = new URL(event.url);
        assert.equal(url.origin, "https://auth.openai.com");
        console.log(JSON.stringify({ status: "waiting_for_browser", url: url.href }));
      }
    },
    prompt(prompt) {
      assert.equal(prompt.type, "manual_code");
      // The loopback callback is forwarded through SSH, not exposed publicly.
      return new Promise((_, reject) => {
        const abort = prompt.signal ?? signal;
        if (abort.aborted) reject(new Error("Login cancelled"));
        else abort.addEventListener("abort", () => reject(new Error("Login cancelled")), { once: true });
      });
    },
  }, { getDeviceId: () => readFileSync(deviceFile, "utf8").trim(), agentName: "my_pi VPS updater" });
  saveCredential(credential, join(config.auth_home, ".pi/agent/auth.json"));
  console.log(JSON.stringify({ status: "authorized", provider: "openai", subscription: true }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv[2] === "--self-test") selfCheck();
    else await login();
  } catch (error) {
    // OAuth errors may contain token response bodies; never print them.
    console.error(JSON.stringify({ status: "login_failed", error: error.name }));
    process.exitCode = 1;
  }
}
