#!/usr/bin/env node
// Sets OpenRouter provider order by cache-read price. Runs hourly from a systemd user timer.
import { closeSync, copyFileSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MODEL = process.argv[2]?.startsWith("--") || !process.argv[2]
  ? "deepseek/deepseek-v4.1-flash-1017"
  : process.argv[2];
const DRY_RUN = process.argv.includes("--dry-run");
// Short list keeps billing close to the first provider; a full outage must fail loudly.
const TOP_N = 3;
// Catalog maxTokens 943718 made OpenRouter drop upstreams with lower output caps; 65536 keeps
// every fp8 endpoint eligible and is far above what one reply needs.
const MAX_TOKENS = 65536;
// Sent with every request so OpenRouter cannot route this slug to a non-fp8 upstream.
const QUANTIZATIONS = ["fp8"];
const TIERS = ["/flex", "/priority", "/spot"];
// shortcut: static denylist, re-probe when the list changes; stepfun answers 400 input_invalid
// to Pi's read/bash/edit/write/codemode tool set (probed 2026-11-14).
export const BROKEN_TAGS = new Set(["stepfun/fp8"]);
const agentDir = process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi/agent");
const modelsFile = join(agentDir, "models.json");
const LOCK_FILE = `${modelsFile}.lock`;
const STALE_LOCK_MS = 5 * 60 * 1000;

const priceOf = (endpoint, key) => {
  const raw = endpoint.pricing?.[key];
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
};
const num = (endpoint, key) => priceOf(endpoint, key);
const PRICE_KEYS = ["input_cache_read", "prompt", "completion"];
const hasPrices = (endpoint) => PRICE_KEYS.every((key) => priceOf(endpoint, key) !== null);

export function rankProviders(endpoints, limit = TOP_N) {
  return endpoints
    .filter((endpoint) => endpoint.status === 0)
    .filter((endpoint) => endpoint.quantization === "fp8")
    .filter((endpoint) => !TIERS.some((tier) => endpoint.tag.includes(tier)))
    .filter((endpoint) => !BROKEN_TAGS.has(endpoint.tag))
    .filter((endpoint) => (endpoint.max_completion_tokens ?? 0) >= MAX_TOKENS)
    .filter(hasPrices)
    .sort((a, b) =>
      num(a, "input_cache_read") - num(b, "input_cache_read")
      || num(a, "prompt") - num(b, "prompt")
      || num(a, "completion") - num(b, "completion"))
    .slice(0, limit)
    .map((endpoint) => endpoint.tag);
}

// Pi bills from model.cost, so it follows the provider that serves the request first.
export function topCost(endpoints, order) {
  const endpoint = endpoints.find((item) => item.tag === order[0]);
  if (!endpoint || !hasPrices(endpoint)) throw new Error(`no valid pricing for ${order[0]}, models.json untouched`);
  const perMillion = (key) => Number((num(endpoint, key) * 1e6).toFixed(6));
  return { input: perMillion("prompt"), output: perMillion("completion"), cacheRead: perMillion("input_cache_read") };
}

function pruneBackups(modelsFile, keep) {
  const prefix = `${basename(modelsFile)}.bak-cache-order-`;
  const stale = readdirSync(dirname(modelsFile))
    .filter((name) => name.startsWith(prefix))
    .sort()
    .slice(0, -keep);
  for (const name of stale) rmSync(join(dirname(modelsFile), name));
  return stale.length;
}

// Exclusive create; a lock left by a crash is taken over after STALE_LOCK_MS.
function acquireLock() {
  for (;;) {
    try {
      closeSync(openSync(LOCK_FILE, "wx"));
      writeFileSync(LOCK_FILE, String(process.pid));
      return () => rmSync(LOCK_FILE, { force: true });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      if (Date.now() - statSync(LOCK_FILE).mtimeMs < STALE_LOCK_MS) {
        throw new Error(`another run holds ${LOCK_FILE}, models.json untouched`);
      }
      rmSync(LOCK_FILE, { force: true });
    }
  }
}

async function main() {
  const url = `https://openrouter.ai/api/v1/models/${MODEL}/endpoints`;
  const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`OpenRouter endpoints ${response.status} for ${MODEL}`);
  const { data } = await response.json();
  const order = rankProviders(data.endpoints);
  if (order.length === 0) throw new Error(`no live provider for ${MODEL}, models.json untouched`);

  const byTag = new Map(data.endpoints.map((endpoint) => [endpoint.tag, endpoint]));
  const perMillion = (endpoint, key) => (num(endpoint, key) * 1e6).toFixed(4);
  for (const tag of order) {
    const endpoint = byTag.get(tag);
    console.log(
      `${tag.padEnd(22)} cache=${perMillion(endpoint, "input_cache_read")}`
      + ` in=${perMillion(endpoint, "prompt")} out=${perMillion(endpoint, "completion")}`,
    );
  }

  const configText = readFileSync(modelsFile, "utf8");
  const config = JSON.parse(configText);
  config.providers ??= {};
  config.providers.openrouter ??= {};
  config.providers.openrouter.modelOverrides ??= {};
  config.providers.openrouter.modelOverrides[MODEL] ??= {};
  const override = config.providers.openrouter.modelOverrides[MODEL];
  const cost = topCost(data.endpoints, order);
  override.compat ??= {};
  override.compat.openRouterRouting ??= {};
  const routing = override.compat.openRouterRouting;
  const managed = JSON.stringify([
    routing.order, routing.allow_fallbacks, routing.quantizations,
    override.cost?.input, override.cost?.output, override.cost?.cacheRead, override.maxTokens,
  ]);
  const wanted = JSON.stringify([
    order, false, QUANTIZATIONS, cost.input, cost.output, cost.cacheRead, MAX_TOKENS,
  ]);
  const unchanged = managed === wanted;
  // Only managed fields change; data_collection, cost.cacheWrite and new schema fields stay.
  routing.order = order;
  routing.allow_fallbacks = false;
  routing.quantizations = [...QUANTIZATIONS];
  override.cost ??= {};
  override.cost.input = cost.input;
  override.cost.output = cost.output;
  override.cost.cacheRead = cost.cacheRead;
  override.maxTokens = MAX_TOKENS;
  console.log(`cost ${order[0]}: input=${cost.input} output=${cost.output} cacheRead=${cost.cacheRead}`);

  if (DRY_RUN) {
    console.log(`dry run: ${order.length} providers, ${modelsFile} untouched`);
    return;
  }
  if (unchanged) {
    console.log(`unchanged: ${order.length} providers, ${modelsFile} untouched`);
    return;
  }
  const lock = acquireLock();
  try {
    const fresh = readFileSync(modelsFile, "utf8");
    if (fresh !== configText) throw new Error(`${modelsFile} changed during the run, retry`);    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backup = `${modelsFile}.bak-cache-order-${stamp}`;
    copyFileSync(modelsFile, backup);
    const temp = `${modelsFile}.${process.pid}.tmp`;
    writeFileSync(temp, `${JSON.stringify(config, null, 2)}\n`);
    renameSync(temp, modelsFile);
    const pruned = pruneBackups(modelsFile, 10);
    console.log(`wrote ${order.length} providers to ${modelsFile}, backup ${backup}, pruned ${pruned}`);
  } finally {
    lock();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}