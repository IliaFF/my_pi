#!/usr/bin/env node
import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const present = path => lstatSync(path, { throwIfNoEntry: false }) !== undefined;
const legacy = "8869ae7da95170063bfd";

function directory(path) {
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Unsafe directory: ${path}`);
  return stat;
}

function json(path) {
  if (!lstatSync(path).isFile()) throw new Error(`Unsafe metadata: ${path}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

export function retireBrowserStack(agent, backup) {
  agent = resolve(agent);
  backup = resolve(backup);
  directory(agent);
  const backupStat = directory(backup);
  agent = realpathSync(agent);
  backup = realpathSync(backup);
  if (backupStat.mode & 0o077) throw new Error("Backup must be private (0700)");
  if (backup === agent || backup.startsWith(agent + sep)) throw new Error("Backup must be outside the agent directory");
  const targets = [];
  const store = join(agent, "stack");
  if (present(store)) {
    directory(store);
    for (const identity of readdirSync(store)) {
      const root = join(store, identity);
      directory(root);
      const payloads = ["mcp", "browsers"].filter(name => present(join(root, name)));
      if (!payloads.length) continue;
      if (identity !== legacy || json(join(root, "complete.json")).identity !== identity) throw new Error("Unrecognized browser stack; review before cleanup");
      for (const name of payloads) {
        const path = join(root, name);
        directory(path);
        if (name === "mcp") {
          const metadata = json(join(path, "package.json"));
          if (metadata.name !== "my-pi-mcp-stack" || JSON.stringify(metadata.dependencies) !== JSON.stringify({ "@jkudish/jev-browser": "0.8.3" })) throw new Error("Customized MCP environment; refusing cleanup");
          if (readdirSync(path).some(entry => !["node_modules", "package.json", "package-lock.json"].includes(entry))) throw new Error("Unclassified files in MCP environment");
        } else {
          for (const entry of readdirSync(path)) {
            const child = join(path, entry);
            directory(child);
            if (entry === ".links") continue;
            if (!/^(chromium|chromium_headless_shell|ffmpeg)-\d+$/.test(entry) || !present(join(child, "INSTALLATION_COMPLETE"))) throw new Error("Unclassified browser payload; refusing cleanup");
            if (readdirSync(child).some(item => /^(Default|Profile.*|Local State|user-data.*)$/.test(item))) throw new Error("Personal browser data; refusing cleanup");
          }
        }
        targets.push(`stack/${identity}/${name}`);
      }
    }
  }
  if (present(join(agent, "bin"))) directory(join(agent, "bin"));
  const launcher = join(agent, "bin/jev-browser");
  if (present(launcher)) {
    if (!lstatSync(launcher).isFile()) throw new Error("Unsafe browser launcher");
    const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
    const root = join(store, legacy);
    const expected = `#!/usr/bin/env bash\n# Managed by my-pi portable-stack\nset -euo pipefail\nexport PLAYWRIGHT_BROWSERS_PATH=${quote(join(root, "browsers"))}\nexec node ${quote(join(root, "mcp/node_modules/@jkudish/jev-browser/dist/index.js"))} "$@"\n`;
    if (readFileSync(launcher, "utf8") !== expected) throw new Error("Customized browser launcher; refusing cleanup");
    targets.push("bin/jev-browser");
  }
  const destination = join(backup, "browser-payloads");
  if (!targets.length) return [];
  if (present(destination)) throw new Error("Browser backup already exists; retain and review it");
  for (const target of targets) {
    if (lstatSync(join(agent, target)).dev !== backupStat.dev) throw new Error("Browser quarantine requires backup on the same filesystem");
  }
  mkdirSync(destination, { mode: 0o700 });
  // Journal precedes renames: interrupted migration can be restored without guessing paths.
  writeFileSync(join(destination, "state.json"), JSON.stringify({ agent, targets }, null, 2) + "\n", { mode: 0o600 });
  for (const target of targets) {
    const saved = join(destination, target);
    mkdirSync(dirname(saved), { recursive: true, mode: 0o700 });
    renameSync(join(agent, target), saved);
  }
  return targets;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 4) throw new Error("Usage: node scripts/retire-browser-stack.mjs AGENT EXISTING_PRIVATE_BACKUP");
    console.log(`PASS retired browser payloads: ${retireBrowserStack(process.argv[2], process.argv[3]).length}`);
  } catch (error) {
    console.error(`FAIL ${error.message}; retain backup and inspect browser-payloads/state.json before retrying`);
    process.exitCode = 1;
  }
}
