import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { formatProviders, loadEndpoints, pinnedModel, providerChoices } from "./data.mjs";

const usage = "Использование: /providers, /providers all, /providers use <слаг>, /providers reset";

export default function (pi: ExtensionAPI) {
  pi.registerEntryRenderer<{ text: string }>("openrouter-providers", (entry) => {
    return new Text(entry.data?.text ?? "Нет данных провайдеров.", 0, 0);
  });

  pi.registerCommand("providers", {
    description: "Цены и скорость провайдеров OpenRouter, выбор провайдера для сессии",
    handler: async (args, ctx) => {
      try {
        const [option, value, ...rest] = args.trim().split(/\s+/).filter(Boolean);
        const known = !option || option === "all" || option === "reset" || (option === "use" && Boolean(value));
        if (!known || rest.length || (option === "reset" && value)) throw new Error(usage);
        const current = ctx.model;
        if (current?.provider !== "openrouter") throw new Error("Команда доступна для активной модели OpenRouter.");

        if (option === "reset") {
          const configured = ctx.modelRegistry.find(current.provider, current.id);
          if (!configured) throw new Error(`Модель ${current.id} не найдена в конфиге.`);
          if (!(await pi.setModel(configured))) throw new Error("Нет ключа OpenRouter для этой модели.");
          const order = configured.compat?.openRouterRouting?.order;
          pi.appendEntry("openrouter-providers", { text: `Маршрут из models.json: ${order?.length ? order.join(", ") : "по умолчанию"}` });
          return;
        }

        const apiKey = await ctx.modelRegistry.getApiKeyForProvider("openrouter");
        if (!apiKey) throw new Error("Для статистики скорости нужен ключ OpenRouter. Выполните /login.");
        const endpoints = await loadEndpoints(current, fetch, { apiKey });
        const choices = providerChoices(current, endpoints);

        let tag = value;
        if (option === "use") {
          if (!choices.some((choice) => choice.tag === tag)) {
            throw new Error(endpoints.some((entry) => entry.tag === tag)
              ? `${tag} вне списка: не fp8, нестандартный тип или скрыт лимитом 10. /providers all — все.`
              : `Провайдер ${tag} не найден в свежем каталоге.`);
          }
        } else if (!option && ctx.hasUI && ctx.mode === "tui") {
          const picked = await ctx.ui.select("Провайдер для сессии:", choices.map((choice) => choice.label));
          tag = choices.find((choice) => choice.label === picked)?.tag;
        }

        let model = current;
        if (tag) {
          model = pinnedModel(current, tag);
          if (!(await pi.setModel(model))) throw new Error(`Нет ключа OpenRouter для ${tag}.`);
        }
        const text = [
          tag ? `Выбран в сессии: ${tag} · order [${tag}] · allow_fallbacks false` : null,
          formatProviders(model, endpoints, new Date().toISOString(), option === "all"),
        ].filter(Boolean).join("\n\n");
        pi.appendEntry("openrouter-providers", { text });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        pi.appendEntry("openrouter-providers", { text: `Ошибка /providers: ${message}` });
      }
    },
  });
}
