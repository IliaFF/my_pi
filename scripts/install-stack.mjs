#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const digest = data => createHash("sha256").update(data).digest("hex");
const present = path => lstatSync(path, { throwIfNoEntry: false }) !== undefined;
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
const execute = (command, args, options = {}) => execFileSync("timeout", ["-k", "5s", "600s", command, ...args], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024, ...options,
});

function launcherContents(agent, destination) {
  const wrappers = {
    firstmate: `export PATH=${quote(join(destination, "bin"))}:"$PATH"\nexport PI_CODING_AGENT_DIR=${quote(agent)}\nexport FM_HOME=${quote(join(destination, "firstmate"))}\nexport FM_PI_HARNESS=pi\nunset FM_ROOT_OVERRIDE FM_CONFIG_OVERRIDE FM_STATE_OVERRIDE FM_DATA_OVERRIDE FM_PROJECTS_OVERRIDE\ncd "$FM_HOME"\nexec pi "$@"`,
    "jev-browser": `export PLAYWRIGHT_BROWSERS_PATH=${quote(join(destination, "browsers"))}\nexec node ${quote(join(destination, "mcp/node_modules/@jkudish/jev-browser/dist/index.js"))} "$@"`,
    "paper-search-mcp": `exec ${quote(join(destination, "paper/bin/paper-search-mcp"))} "$@"`,
  };
  return Object.fromEntries(Object.entries(wrappers).map(([name, body]) => [name, `#!/usr/bin/env bash\n# Managed by my-pi portable-stack\nset -euo pipefail\n${body}\n`]));
}

export function stackIdentity(root) {
  // shortcut: identity covers declared inputs; bump lock schemaVersion when changing the installed layout.
  return digest(["lock.json", "package-lock.json", "paper-requirements.txt", "paper-search-installed.patch"]
    .map(name => readFileSync(join(root, "stack", name))).join("\n")).slice(0, 20);
}

export function preflight(root, agent, run = execute) {
  if (process.platform !== "linux" || process.arch !== "x64") throw new Error("Stack artifacts support Linux x86_64/WSL only");
  for (const command of ["git", "curl", "tar", "timeout", "uv", "node", "npm"]) run(command, ["--version"]);
  run("tmux", ["-V"]);
  for (const name of ["bin", "extensions", "skills"]) {
    const directory = join(agent, name);
    if (present(directory) && (lstatSync(directory).isSymbolicLink() || !lstatSync(directory).isDirectory())) throw new Error(`Refusing linked or invalid managed directory: ${name}`);
  }
  for (const skill of ["cpp-styleguide", "python-styleguide", "latex-simple-style"]) {
    const directory = join(agent, "skills", skill);
    if (present(directory) && (lstatSync(directory).isSymbolicLink() || !lstatSync(directory).isDirectory())) throw new Error(`Refusing linked or invalid skill: ${skill}`);
  }
  for (const [target, source] of [["extensions/aitunnel.ts", "local-extensions/aitunnel.ts"], ...["cpp-styleguide", "python-styleguide", "latex-simple-style"].map(s => [`skills/${s}/SKILL.md`, `skills/${s}/SKILL.md`])]) {
    const file = join(agent, target);
    if (present(file) && (lstatSync(file).isSymbolicLink() || !lstatSync(file).isFile() || !readFileSync(file).equals(readFileSync(join(root, source))))) throw new Error(`Preserve and review customized component before installation: ${target}`);
  }
  const destination = join(agent, "stack", stackIdentity(root));
  const bin = join(agent, "bin");
  for (const [name, expected] of Object.entries(launcherContents(agent, destination))) {
    const file = join(bin, name);
    if (present(file) && (lstatSync(file).isSymbolicLink() || !readFileSync(file, "utf8").includes("# Managed by my-pi portable-stack"))) throw new Error(`Refusing unrelated launcher: ${name}`);
    if (present(file) && readFileSync(file, "utf8") !== expected) throw new Error(`Existing stack release differs; review runtime migration before switching ${name}`);
  }
  const store = join(agent, "stack");
  if (present(store) && (lstatSync(store).isSymbolicLink() || !lstatSync(store).isDirectory())) throw new Error("Refusing unsafe stack store");
  if (present(destination) && (lstatSync(destination).isSymbolicLink() || !existsSync(join(destination, "complete.json")) || lstatSync(join(destination, "complete.json")).isSymbolicLink())) {
    throw new Error(`Refusing existing incomplete or linked stack: ${destination}`);
  }
  return destination;
}

export function installStack(root, agent, run = execute) {
  root = resolve(root);
  agent = resolve(agent);
  const destination = preflight(root, agent, run);
  const lock = JSON.parse(readFileSync(join(root, "stack/lock.json"), "utf8"));
  const marker = join(destination, "complete.json");
  const git = (directory, ...args) => run("git", ["-C", directory, ...args]);
  const verifyFirstmate = () => {
    if (git(join(destination, "firstmate"), "rev-parse", "HEAD").trim() !== lock.firstmate.commit) throw new Error("Firstmate revision differs; not overwriting");
    git(join(destination, "firstmate"), "diff", "--quiet", "HEAD", "--");
  };
  const verifyPaper = () => {
    const installed = run(join(destination, "paper/bin/python"), ["-c", "import hashlib,importlib.metadata as m;from pathlib import Path;d=m.distribution('paper-search-mcp');print(d.version);print(hashlib.sha256(Path(d.locate_file('paper_search_mcp/server.py')).read_bytes()).hexdigest())"]).trim();
    if (installed !== `${lock.paper.version}\n${lock.paper.serverSha256}`) throw new Error("Installed paper-search metadata or module hash differs");
  };
  if (existsSync(marker)) {
    const previous = JSON.parse(readFileSync(marker, "utf8"));
    if (previous.identity !== stackIdentity(root)) throw new Error("Stack marker does not match source");
    verifyFirstmate();
    for (const artifact of lock.artifacts) {
      const name = join(destination, "bin", artifact.name);
      if (lstatSync(name).isSymbolicLink() || digest(readFileSync(name)) !== previous.binaries[artifact.name]) throw new Error(`Modified stack binary: ${artifact.name}`);
    }
    verifyPaper();
  } else {
    mkdirSync(join(destination, "bin"), { recursive: true, mode: 0o700 });
    // Keep incomplete stores for inspection; never delete a possible Firstmate runtime.
    const checkout = (name, source) => {
      const directory = join(destination, name);
      mkdirSync(directory);
      git(directory, "init", "--quiet");
      git(directory, "remote", "add", "origin", source.repository);
      git(directory, "-c", "http.lowSpeedLimit=1000", "-c", "http.lowSpeedTime=30", "fetch", "--depth=1", "origin", source.commit);
      git(directory, "checkout", "--detach", "FETCH_HEAD");
      if (git(directory, "rev-parse", "HEAD").trim() !== source.commit) throw new Error(`Unexpected ${name} revision`);
      return directory;
    };
    const firstmate = checkout("firstmate", lock.firstmate);
    mkdirSync(join(firstmate, "config"), { recursive: true });
    writeFileSync(join(firstmate, "config/backend"), "herdr\n");
    writeFileSync(join(firstmate, "config/crew-harness"), "pi\n");
    const binaries = {};
    for (const artifact of lock.artifacts) {
      if (!/^[a-f0-9]{64}$/.test(artifact.sha256) || !artifact.url.startsWith("https://github.com/")) throw new Error("Invalid artifact pin");
      const archive = join(destination, `${artifact.name}.download`);
      run("curl", ["--fail", "--location", "--proto", "=https", "--connect-timeout", "20", "--max-time", "240", "--max-filesize", "134217728", "--output", archive, artifact.url]);
      if (digest(readFileSync(archive)) !== artifact.sha256) throw new Error(`Checksum mismatch: ${artifact.name}`);
      const binary = join(destination, "bin", artifact.name);
      if (artifact.member) {
        const content = run("tar", ["-xOzf", archive, artifact.member], { encoding: "buffer", maxBuffer: 128 * 1024 * 1024 });
        writeFileSync(binary, content, { mode: 0o755 });
      } else copyFileSync(archive, binary);
      chmodSync(binary, 0o755);
      binaries[artifact.name] = digest(readFileSync(binary));
      unlinkSync(archive);
    }
    const mcp = join(destination, "mcp");
    mkdirSync(mcp);
    for (const name of ["package.json", "package-lock.json"]) copyFileSync(join(root, "stack", name), join(mcp, name));
    const env = { ...process.env, PLAYWRIGHT_BROWSERS_PATH: join(destination, "browsers"), JEV_BROWSER_SKIP_BROWSER_DOWNLOAD: "1" };
    run("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund", "--prefix", mcp], { env });
    run("node", [join(mcp, "node_modules/playwright/cli.js"), "install", "chromium"], { env });
    const paperSource = checkout("paper-source", lock.paper);
    const patch = readFileSync(join(root, "stack/paper-search-installed.patch"));
    run("git", ["-C", paperSource, "apply", "--check", "-"], { input: patch });
    run("git", ["-C", paperSource, "apply", "-"], { input: patch });
    if (digest(readFileSync(join(paperSource, "paper_search_mcp/server.py"))) !== lock.paper.serverSha256) throw new Error("Paper-search source does not reproduce installed implementation");
    const paper = join(destination, "paper");
    run("uv", ["venv", "--python", lock.python, paper]);
    run("uv", ["pip", "install", "--python", join(paper, "bin/python"), "-r", join(root, "stack/paper-requirements.txt")]);
    run("uv", ["pip", "install", "--python", join(paper, "bin/python"), "--no-deps", paperSource]);
    verifyPaper();
    verifyFirstmate();
    writeFileSync(marker, JSON.stringify({ identity: stackIdentity(root), binaries }, null, 2) + "\n", { mode: 0o600 });
  }
  const bin = join(agent, "bin");
  mkdirSync(bin, { recursive: true });
  for (const [name, content] of Object.entries(launcherContents(agent, destination))) {
    const file = join(bin, name);
    if (present(file) && lstatSync(file).isSymbolicLink()) throw new Error(`Refusing linked launcher: ${name}`);
    writeFileSync(file, content, { mode: 0o755 });
    chmodSync(file, 0o755);
  }
  return destination;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const agent = resolve(process.argv[2] ?? process.env.PI_CODING_AGENT_DIR ?? join(process.env.HOME, ".pi/agent"));
  try {
    if (process.argv.includes("--preflight")) preflight(sourceRoot, agent);
    else console.log(`PASS portable stack installed: ${installStack(sourceRoot, agent)}`);
  } catch (error) {
    console.error(`FAIL ${error.message}. No independent Firstmate home or agent data was removed.`);
    process.exitCode = 1;
  }
}
