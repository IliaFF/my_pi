import { writeFileSync } from "node:fs";
import { join } from "node:path";

export const MODEL = "deepseek/deepseek-v4.1-flash-1017";
export const ORDER = ["probe-a/fp8", "probe-b/fp8"];
export const KEY = "sk-or-v1-test";

export function writeRoutingFixture(dir, routing, baseUrl = "https://openrouter.ai/api/v1") {
  const write = (name, value) => writeFileSync(join(dir, `${name}.json`), JSON.stringify(value));
  write("settings", { defaultProvider: "openrouter", defaultModel: MODEL });
  write("models-store", { openrouter: { checkedAt: Date.now(), models: [{
    id: MODEL, name: MODEL, provider: "openrouter", api: "openai-completions", baseUrl,
    reasoning: false, input: ["text"], contextWindow: 128_000, maxTokens: 4_096,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  }] } });
  write("models", { providers: { openrouter: { baseUrl, modelOverrides: {
    [MODEL]: { compat: { openRouterRouting: routing } },
  } } } });
  write("auth", { openrouter: { type: "api_key", key: KEY } });
}
