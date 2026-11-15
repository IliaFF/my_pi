// Offline check: Pi must send provider.order from compat.openRouterRouting.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MODEL = "deepseek/deepseek-v4.1-flash-1017";
const liveConfig = process.argv.includes("--config");
const fixture = { order: ["probe-a/fp8", "probe-b/fp8"], allow_fallbacks: false };
const work = mkdtempSync(join(tmpdir(), "pi-cache-check-"));
const bodies = [];

const server = createServer((request, response) => {
  let raw = "";
  request.on("data", (chunk) => { raw += chunk; });
  request.on("end", () => {
    bodies.push({ url: request.url, body: raw ? JSON.parse(raw) : null });
    response.writeHead(200, { "content-type": "text/event-stream" });
    const chunk = (delta, finish, usage) => `data: ${JSON.stringify({
      id: "probe", object: "chat.completion.chunk", created: 0, model: MODEL,
      choices: [{ index: 0, delta, finish_reason: finish }], usage,
    })}\n\n`;
    response.write(chunk({ role: "assistant", content: "ok" }, null, null));
    response.write(chunk({}, "stop", { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }));
    response.end("data: [DONE]\n\n");
  });
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;

try {
  cpSync(join(process.env.HOME, ".pi/agent/settings.json"), join(work, "settings.json"));
  cpSync(join(process.env.HOME, ".pi/agent/models-store.json"), join(work, "models-store.json"));
  const models = liveConfig
    ? JSON.parse(readFileSync(join(process.env.HOME, ".pi/agent/models.json"), "utf8"))
    : {
      providers: {
        openrouter: { modelOverrides: { [MODEL]: { compat: { openRouterRouting: fixture } } } },
      },
    };
  const expected = models.providers.openrouter.modelOverrides[MODEL].compat.openRouterRouting;
  models.providers.openrouter.baseUrl = `http://127.0.0.1:${port}/v1`;
  writeFileSync(join(work, "models.json"), JSON.stringify(models, null, 2));
  writeFileSync(join(work, "auth.json"), JSON.stringify({ openrouter: { type: "api_key", key: "sk-or-v1-test" } }));

  const child = spawn("pi", ["-p", "ping", "--model", `openrouter/${MODEL}`, "--no-session", "--no-mcp"], {
    cwd: work,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PI_CODING_AGENT_DIR: work, PI_OFFLINE: "1", OPENROUTER_API_KEY: "sk-or-v1-test" },
  });
  let stderr = "";
  child.stdout.resume();
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const timer = setTimeout(() => child.kill("SIGKILL"), 90_000);
  const code = await new Promise((resolve) => child.on("exit", resolve));
  clearTimeout(timer);
  assert.equal(code, 0, `pi exited ${code}: ${stderr.slice(-400)}`);

  const request = bodies.find((item) => item.url?.includes("chat/completions"));
  assert.ok(request, `no chat completion request captured: ${JSON.stringify(bodies).slice(0, 300)}`);
  assert.deepEqual(request.body.provider, expected, `provider field mismatch: ${JSON.stringify(request.body.provider)}`);
  console.log(`PASS provider.order sent (${expected.order.length} providers): ${JSON.stringify(expected.order.slice(0, 3))}...`);
} finally {
  server.close();
  rmSync(work, { recursive: true, force: true });
}
