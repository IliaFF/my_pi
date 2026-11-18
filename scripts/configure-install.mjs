import { mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const [mode, root, agent, option] = process.argv.slice(2);
const read = (file) => JSON.parse(readFileSync(file, "utf8"));
function existing(file) {
  try { return read(file); }
  catch (err) { if (err.code === "ENOENT") return {}; throw err; }
}
function replace(file, data) {
  const temp = mkdtempSync(join(dirname(file), ".my-pi-"));
  try {
    const staged = join(temp, "config.json");
    writeFileSync(staged, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
    renameSync(staged, file);
  } finally { rmSync(temp, { recursive: true, force: true }); }
}
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
if (mode === "settings") {
  const file = join(agent, "settings.json");
  const defaults = read(join(root, "configs/settings.json"));
  defaults.packages = read(join(root, "configs/extension-profile.json")).packages;
  const current = option === "1" ? existing(file) : {};
  const source = (value) => typeof value === "string" ? value : value?.source;
  const name = (value) => source(value)?.replace(/@[^/@]+$/, "");
  const pinned = new Map(defaults.packages.map((entry) => [name(entry), entry]));
  const packages = (current.packages ?? []).map((entry) => {
    const pin = pinned.get(name(entry));
    if (!pin) return entry;
    pinned.delete(name(entry));
    return typeof entry === "string" ? pin : { ...entry, source: pin };
  });
  replace(file, { ...defaults, ...current, packages: [...packages, ...pinned.values()] });
} else if (mode === "openrouter") {
  const file = join(agent, "models.json");
  const current = existing(file);
  const defaults = read(join(root, "configs/models.json")).providers.openrouter.modelOverrides;
  const [id] = Object.keys(defaults);
  if (![current, current.providers ?? {}, current.providers?.openrouter ?? {}, current.providers?.openrouter?.modelOverrides ?? {}].every(object)) {
    throw new Error("Invalid models.json structure");
  }
  current.providers ??= {};
  const provider = current.providers.openrouter ??= {};
  const models = provider.modelOverrides ??= {};
  const old = models[id] ?? {};
  const route = defaults[id];
  models[id] = {
    ...old, ...route,
    compat: { ...old.compat, ...route.compat, openRouterRouting: { ...old.compat?.openRouterRouting, ...route.compat.openRouterRouting } },
    cost: { ...old.cost, ...route.cost },
  };
  const quote = (value) => {
    if (/[\x00-\x1f\x7f]/.test(value)) throw new Error("Unsupported control character in systemd path");
    return JSON.stringify(value.replaceAll("%", "%%"));
  };
  const template = (name) => readFileSync(join(root, "configs/systemd", name), "utf8");
  const service = template("openrouter-cache-order.service") + [
    `Environment=${quote("PI_CODING_AGENT_DIR=" + agent)}`,
    `ExecStart=:${quote(process.execPath)} ${quote(join(agent, "scripts/openrouter-cache-order.mjs"))}`,
    "",
  ].join("\n");
  writeFileSync(join(option, "openrouter-cache-order.service"), service, { flag: "wx" });
  writeFileSync(join(option, "openrouter-cache-order.timer"), template("openrouter-cache-order.timer"), { flag: "wx" });
  replace(file, current);
} else {
  throw new Error(`Unexpected configuration mode: ${mode}`);
}
