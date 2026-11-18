import { rankProviders } from "../../scripts/openrouter-cache-order.mjs";

const priceKeys = ["input_cache_read", "prompt", "completion"];

function number(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
}

const clean = (value) => String(value).replace(/[\x00-\x1f\x7f-\x9f]/g, "");
const price = (value) => number(value) === null ? "нет данных" : `$${(number(value) * 1e6).toFixed(6)}`;
function speed(value) {
  const median = number(value && typeof value === "object" ? value.p50 : value);
  return median === null ? "нет" : median.toFixed(1);
}

function layout(endpoints, order, all) {
  const eligible = new Set(rankProviders(endpoints, Infinity));
  const sorted = [...endpoints].sort((a, b) => {
    for (const key of priceKeys) {
      const av = number(a.pricing?.[key]) ?? Infinity;
      const bv = number(b.pricing?.[key]) ?? Infinity;
      if (av !== bv) return av < bv ? -1 : 1;
    }
    return a.tag.localeCompare(b.tag);
  });
  const active = order.map((tag) => endpoints.find((entry) => entry.tag === tag)).filter(Boolean);
  const candidates = sorted.filter((entry) => !order.includes(entry.tag) && eligible.has(entry.tag));
  const excluded = sorted.filter((entry) => !order.includes(entry.tag) && !eligible.has(entry.tag));
  return { order, eligible, shown: [...active, ...candidates].slice(0, all ? Infinity : 10), excluded };
}

function row(view, entry, all) {
  const index = view.order.indexOf(entry.tag);
  const mark = index === 0 ? "основной" : index > 0 ? `запасной ${index}` : view.eligible.has(entry.tag) ? "кандидат" : "исключён";
  const cells = [
    clean(entry.tag).padEnd(20),
    price(entry.pricing?.input_cache_read).padEnd(9),
    price(entry.pricing?.prompt).padEnd(9),
    price(entry.pricing?.completion).padEnd(9),
    speed(entry.throughput_last_30m).padEnd(8),
    mark,
  ];
  if (all) cells.splice(1, 0, clean(entry.quantization ?? "неизвестен").padEnd(8));
  return cells.join(" ");
}

/** Копия модели с маршрутом из одного провайдера; исходный объект не меняется. */
export function pinnedModel(model, tag) {
  return {
    ...model,
    compat: { ...model.compat, openRouterRouting: { ...model.compat?.openRouterRouting, order: [tag], allow_fallbacks: false } },
  };
}

/** Строки выбора в том же порядке и виде, что и таблица. */
export function providerChoices(model, endpoints, all = false) {
  const view = layout(endpoints, model.compat?.openRouterRouting?.order ?? [], all);
  return view.shown.map((entry) => ({ tag: entry.tag, label: row(view, entry, all) }));
}

export function formatProviders(model, endpoints, timestamp, all = false) {
  const view = layout(endpoints, model.compat?.openRouterRouting?.order ?? [], all);
  const { order, shown, excluded } = view;
  const lines = [
    `OpenRouter: ${clean(model.id)} · ${timestamp}`,
    "Цены: USD за 1M токенов. Скорость: p50 за последние 30 минут, токен/с.",
    "",
    ["Провайдер".padEnd(20), all ? "Тип".padEnd(8) : "", "Кеш".padEnd(9), "Вход".padEnd(9), "Выход".padEnd(9), "Токен/с".padEnd(8), "Маршрут"].filter(Boolean).join(" "),
  ];
  const absent = order.filter((tag) => !endpoints.some((entry) => entry.tag === tag));
  for (const entry of shown) lines.push(row(view, entry, all));
  if (all) lines.push("", ...excluded.map((entry) => row(view, entry, all)));
  lines.push("");
  if (absent.length) lines.push(`Нет в свежем каталоге: ${absent.map(clean).join(", ")}.`);
  if (!order.length) lines.push("Маршрут: OpenRouter по умолчанию.");
  lines.push("Основной - первый в маршруте; фактически обслуживший не определён.");
  if (!all) lines.push(`Скрыто: ещё ${endpoints.length - shown.length} провайдеров. /providers all — все.`);
  return lines.join("\n");
}

export async function loadEndpoints(model, fetcher = fetch, { apiKey } = {}) {
  if (model?.provider !== "openrouter") throw new Error("Команда доступна для активной модели OpenRouter.");
  const slug = model.id.split("/").map(encodeURIComponent).join("/");
  const response = await fetcher(`https://openrouter.ai/api/v1/models/${slug}/endpoints`, {
    headers: { accept: "application/json", ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`OpenRouter /endpoints: HTTP ${response.status}`);
  const payload = await response.json();
  const endpoints = payload?.data?.endpoints;
  if (!Array.isArray(endpoints) || endpoints.some((entry) => !entry || typeof entry.tag !== "string")) {
    throw new Error("OpenRouter вернул некорректный список провайдеров.");
  }
  if (!endpoints.length) throw new Error("OpenRouter вернул пустой список провайдеров.");
  return endpoints;
}

export async function loadProviders(model, fetcher = fetch, { apiKey, all = false } = {}) {
  const endpoints = await loadEndpoints(model, fetcher, { apiKey });
  return formatProviders(model, endpoints, new Date().toISOString(), all);
}
