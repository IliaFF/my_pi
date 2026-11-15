import assert from "node:assert/strict";
import { formatProviders, loadProviders } from "../extensions/providers/data.mjs";

const model = { provider: "openrouter", id: "test/model", compat: { openRouterRouting: { order: ["a/fp8", "b/fp8"] } } };
const endpoint = (tag, pricing, throughput = null) => ({ tag, pricing, throughput_last_30m: throughput, status: 0, quantization: "fp8", max_completion_tokens: 65536 });
const endpoints = [
  endpoint("unknown", { prompt: "1e-7", completion: "2e-7" }),
  endpoint("b/fp8", { input_cache_read: "3e-9", prompt: "1e-7", completion: "2e-7" }, 42.5),
  endpoint("a/fp8", { input_cache_read: "2e-9", prompt: "1e-7", completion: "2e-7" }, 0),
];
const output = formatProviders(model, endpoints, "TEST-TIME");
assert.ok(output.indexOf("a/fp8 ") < output.indexOf("b/fp8 "));
assert.match(output, /основной/);
assert.match(output, /запасной 1/);
assert.match(output, /0\.002000/);
assert.match(output, /42\.5/);
assert.match(formatProviders(model, [...endpoints, { ...endpoint("partial", { prompt: "1e-7" }) }, { ...endpoint("no-prices", {}) }], "TEST", true), /^unknown +fp8 +нет данных/m);
assert.match(output, /TEST-TIME/);
assert.match(output, /\na\/fp8 +[^\n]*основной/);
assert.match(output, /\nb\/fp8 +[^\n]*запасной 1/);
assert.match(output, /Кеш +Вход +Выход +Токен\/с +Маршрут/);
const many = Array.from({ length: 15 }, (_, i) => endpoint(`cand${String(i).padStart(2, "0")}`, { input_cache_read: "0.000001", prompt: "0.0000001", completion: "0.0000004" }));
const limited = formatProviders(model, [...endpoints, ...many], "TEST");
assert.equal(limited.match(/ (?:основной|запасной \d|кандидат)$/gm).length, 10);
assert.match(limited, new RegExp(`Скрыто: ещё ${endpoints.length + many.length - 10} провайдеров`));
assert.doesNotMatch(limited, /исключён/);
assert.equal(formatProviders(model, [...endpoints, ...many], "TEST", true).match(/ (?:основной|запасной \d|кандидат|исключён)$/gm).length, endpoints.length + many.length);
const nonFp8 = { ...endpoint("excluded-vendor", {}), quantization: "fp4" };
assert.doesNotMatch(formatProviders(model, [...endpoints, nonFp8], "TEST"), /excluded-vendor/);
assert.match(formatProviders(model, [...endpoints, nonFp8], "TEST", true), /excluded-vendor/);
assert.match(formatProviders(model, [...endpoints, nonFp8], "TEST", true), /исключён/);
assert.match(formatProviders(model, [endpoint("a/fp8", {}, { p50: 87.3, p90: 42 })], "TEST"), /87\.3/);
assert.match(output, /не определён/);
assert.doesNotMatch(formatProviders(model, [endpoint("\x1b[31m\n", {})], "TEST"), /\x1b/);

let calls = 0;
const mockFetch = async (url, options) => {
  calls++;
  assert.equal(url, "https://openrouter.ai/api/v1/models/test/model/endpoints");
  assert.equal(options.cache, "no-store");
  assert.equal(options.headers.authorization, "Bearer test-key");
  assert.ok(options.signal instanceof AbortSignal);
  return { ok: true, json: async () => ({ data: { endpoints: [endpoint(`fresh-${calls}`, { input_cache_read: "2e-9", prompt: "1e-7", completion: "2e-7" })] } }) };
};
assert.match(await loadProviders(model, mockFetch, { apiKey: "test-key" }), /fresh-1/);
assert.match(await loadProviders(model, mockFetch, { apiKey: "test-key" }), /fresh-2/);
assert.equal(calls, 2);
await assert.rejects(loadProviders({ provider: "other" }, mockFetch), /OpenRouter/);
await assert.rejects(loadProviders(model, async () => ({ ok: false, status: 503 })), /HTTP 503/);
await assert.rejects(loadProviders(model, async () => ({ ok: true, json: async () => ({ data: {} }) })), /некорректный/);
await assert.rejects(loadProviders(model, async () => ({ ok: true, json: async () => ({ data: { endpoints: [] } }) })), /пустой/);
await assert.rejects(loadProviders(model, async () => { throw new Error("timeout"); }), /timeout/);
console.log("PASS /providers: prices, throughput, route, missing data, fresh GET per call, errors");
