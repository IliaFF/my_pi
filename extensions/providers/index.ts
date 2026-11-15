import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { loadProviders } from "./data.mjs";

export default function (pi: ExtensionAPI) {
  pi.registerEntryRenderer<{ text: string }>("openrouter-providers", (entry) => {
    return new Text(entry.data?.text ?? "Нет данных провайдеров.", 0, 0);
  });

  pi.registerCommand("providers", {
    description: "Актуальные цены, скорость провайдеров OpenRouter и маршрут активной модели",
    handler: async (args, ctx) => {
      try {
        const option = args.trim();
        if (option && option !== "all") throw new Error("Использование: /providers или /providers all");
        if (ctx.model?.provider !== "openrouter") throw new Error("Команда доступна для активной модели OpenRouter.");
        const apiKey = await ctx.modelRegistry.getApiKeyForProvider("openrouter");
        if (!apiKey) throw new Error("Для статистики скорости нужен ключ OpenRouter. Выполните /login.");
        const text = await loadProviders(ctx.model, fetch, { apiKey, all: option === "all" });
        pi.appendEntry("openrouter-providers", { text });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        pi.appendEntry("openrouter-providers", { text: `Ошибка /providers: ${message}` });
      }
    },
  });
}
