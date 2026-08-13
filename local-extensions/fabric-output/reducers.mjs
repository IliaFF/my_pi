// Adapted from pi-rtk-optimizer 0.9.0 (MIT), Copyright (c) 2026 MasuRii.
// Changes: JavaScript conversion and outer Fabric metadata routing.
const env = /^(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|[^\s]+)\s+)*/;
const normalize = (command) => command?.split(/\r?\n/).map(x => x.trim()).find(Boolean)?.replace(env, "").split(/&&|\|\||;|\|/)[0].trim().toLowerCase();
const isTest = command => /^(npm test|pnpm test|yarn test|bun test|cargo test|go test|pytest|python -m pytest|(?:pnpm )?(?:npx )?vitest|(?:npx )?jest|mocha|ava|tap)\b/.test(normalize(command) ?? "");
const isBuild = command => /^(cargo (build|check)|bun build|npm run build|yarn build|pnpm build|(?:npx )?tsc|make|cmake|gradle|mvn|go (build|install)|python setup\.py build|pip install)\b/.test(normalize(command) ?? "");

function tests(output) {
  const stat = output.match(/(\d+)\s*passed(?:,\s*(\d+)\s*failed)?(?:,\s*(\d+)\s*skipped)?/i);
  const failed = Number(stat?.[2] ?? 0), lines = output.split("\n");
  const signals = lines.filter(line => /^(FAIL|FAILED|\s*●|\s*✕)|panicked|\b(error|fatal)\b/i.test(line)).slice(0, 30);
  return [`Test Results: PASS: ${Number(stat?.[1] ?? 0)} passed${failed ? `; FAIL: ${failed} failed` : ""}${stat?.[3] ? `; SKIP: ${stat[3]}` : ""}`, ...signals].join("\n");
}
function build(output) {
  const lines = output.split("\n"), errors = lines.filter(line => /^(error(?:\[|:)|\[ERROR\]|FAIL)|\bfatal\b/i.test(line)), warnings = lines.filter(line => /^(warning:|\[WARNING\]|warn:)/i.test(line));
  if (!errors.length && !warnings.length) return "[OK] Build successful";
  return [...errors.slice(0, 40), warnings.length ? `[WARN] ${warnings.length} warning(s)` : ""].filter(Boolean).join("\n");
}
function search(output) {
  const rows = output.split("\n").filter(line => /^.+?:\d+?:/.test(line));
  if (!rows.length) return null;
  return `${rows.length} matches:\n${rows.slice(0, 100).join("\n")}${rows.length > 100 ? `\n... +${rows.length - 100} more` : ""}`;
}
function headTail(text, limit) {
  if (text.length <= limit) return text;
  const half = Math.floor((limit - 80) / 2);
  return `${text.slice(0, half)}\n\n... ${text.length - half * 2} chars omitted; exact output externalized ...\n\n${text.slice(-half)}`;
}
export function compactOutput(raw, metadata, limit) {
  const output = raw.includes("\u001b") ? raw.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "").replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "") : raw;
  const command = metadata.command;
  const reduced = isTest(command) ? tests(output) : isBuild(command) ? build(output) : metadata.ref === "pi.grep" ? search(output) : null;
  return headTail(reduced || output, limit);
}
