import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerProvider("aitunnel", {
    name: "AITunnel",
    baseUrl: "https://api.aitunnel.ru/v1/",
    api: "openai-completions",
    apiKey: "$AITUNNEL_API_KEY",
    models: [
      {
        id: "deepseek-v4.1-flash-1017",
        name: "DeepSeek V4.1 Flash 1017 (AITunnel)",
        reasoning: false,
        input: ["text", "image"],
        contextWindow: 1048576,
        maxTokens: 393216,
        // shortcut: prices are AITunnel rubles per 1M tokens, pi reports cost totals in USD.
        cost: { input: 14, output: 36, cacheRead: 0.59, cacheWrite: 0 },
      },
    ],
  });
}
