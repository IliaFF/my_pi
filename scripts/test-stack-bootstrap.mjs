#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installStack, preflight, stackIdentity } from "./install-stack.mjs";

const hash = text => createHash("sha256").update(text).digest("hex");
const temp = mkdtempSync(join(tmpdir(), "pi-stack-bootstrap-"));
const root = join(temp, "source"), agent = join(temp, "agent");
const binary = "reviewed artifact fixture\n", server = "server fixture\n";
const lock = {
  python: "3.13.7",
  firstmate: { repository: "https://github.com/example/firstmate.git", commit: "1".repeat(40) },
  paper: { repository: "https://github.com/example/paper.git", commit: "2".repeat(40), version: "0.1.4", serverSha256: hash(server) },
  artifacts: [{ name: "herdr", version: "0.9.5", url: "https://github.com/example/herdr/releases/download/v0.9.5/herdr", sha256: hash(binary) }],
};
const calls = [];
let corrupt = false, dirty = false;
const run = (command, args, options = {}) => {
  calls.push([command, ...args]);
  if (command === "curl" && args.includes("--output")) writeFileSync(args[args.indexOf("--output") + 1], corrupt ? "corrupt" : binary);
  if (command === "git" && args[0] === "-C") {
    const directory = args[1];
    if (args.includes("checkout") && directory.endsWith("paper-source")) {
      mkdirSync(join(directory, "paper_search_mcp"));
      writeFileSync(join(directory, "paper_search_mcp/server.py"), server);
    }
    if (args.includes("rev-parse")) return (directory.endsWith("paper-source") ? lock.paper.commit : lock.firstmate.commit) + "\n";
    if (args.includes("diff") && dirty) throw new Error("Modified tracked Firstmate fixture");
    if (args.includes("apply")) assert.ok(options.input, "Patch is passed on stdin, not executed as a shell command");
  }
  if (command.endsWith("/paper/bin/python")) return `${lock.paper.version}\n${lock.paper.serverSha256}\n`;
  return "";
};
try {
  mkdirSync(join(root, "stack"), { recursive: true });
  for (const [name, value] of Object.entries({ "lock.json": JSON.stringify(lock), "package.json": "{}\n", "package-lock.json": "{}\n", "paper-requirements.txt": "mcp==1.27.2\n", "paper-search-installed.patch": "reviewed fixture patch\n" })) {
    writeFileSync(join(root, "stack", name), value);
  }
  const unrelated = join(temp, "independent-firstmate");
  mkdirSync(unrelated);
  writeFileSync(join(unrelated, "fleet-state"), "KEEP PRIVATE STATE\n");
  const destination = installStack(root, agent, run);
  assert.equal(destination, join(agent, "stack", stackIdentity(root)));
  assert.equal(readFileSync(join(destination, "firstmate/config/backend"), "utf8"), "herdr\n");
  assert.equal(readFileSync(join(destination, "firstmate/config/crew-harness"), "utf8"), "pi\n");
  assert.equal(readFileSync(join(destination, "bin/herdr"), "utf8"), binary);
  assert.equal(readFileSync(join(unrelated, "fleet-state"), "utf8"), "KEEP PRIVATE STATE\n");
  assert.ok(calls.some(([command, ...args]) => command === "uv" && args[0] === "venv" && args.includes("3.13.7")));
  assert.ok(calls.some(([command, ...args]) => command === "npm" && args[0] === "ci" && args.includes("--ignore-scripts")));
  assert.ok(!calls.some(([command]) => ["herdr", "treehouse", "pi"].includes(command)), "Installation must not launch agents");
  const launcher = readFileSync(join(agent, "bin/firstmate"), "utf8");
  assert.ok(launcher.includes(destination) && launcher.includes('"$@"'));
  const fakeBin = join(temp, "fake-bin");
  mkdirSync(fakeBin);
  writeFileSync(join(fakeBin, "pi"), '#!/usr/bin/env node\nconsole.log(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2),home:process.env.FM_HOME,harness:process.env.FM_PI_HARNESS,agent:process.env.PI_CODING_AGENT_DIR,overrides:["FM_ROOT_OVERRIDE","FM_CONFIG_OVERRIDE","FM_STATE_OVERRIDE","FM_DATA_OVERRIDE","FM_PROJECTS_OVERRIDE"].map(k=>process.env[k]??null)}));\n', { mode: 0o755 });
  const launched = spawnSync("bash", [join(agent, "bin/firstmate"), "--probe", "argument with spaces"], { encoding: "utf8", timeout: 10000,
    env: { ...process.env, PATH: fakeBin + ":" + process.env.PATH, FM_HOME: unrelated, FM_PI_HARNESS: "pi-signed", FM_ROOT_OVERRIDE: unrelated, FM_CONFIG_OVERRIDE: unrelated, FM_STATE_OVERRIDE: unrelated, FM_DATA_OVERRIDE: unrelated, FM_PROJECTS_OVERRIDE: unrelated } });
  assert.equal(launched.status, 0, launched.stderr);
  assert.deepEqual(JSON.parse(launched.stdout), { cwd: join(destination, "firstmate"), args: ["--probe", "argument with spaces"], home: join(destination, "firstmate"), harness: "pi", agent, overrides: [null, null, null, null, null] });
  const downloads = () => calls.filter(([command, ...args]) => (command === "curl" && args.includes("--output")) || (command === "git" && args.includes("fetch"))).length;
  const count = downloads();
  installStack(root, agent, run);
  assert.equal(downloads(), count, "Reinstall must reuse a complete exact stack");
  dirty = true;
  assert.throws(() => installStack(root, agent, run), /Modified tracked Firstmate/);
  dirty = false;
  writeFileSync(join(destination, "bin/herdr"), "modified user binary");
  assert.throws(() => installStack(root, agent, run), /Modified stack binary/);
  writeFileSync(join(destination, "bin/herdr"), binary);
  const oldIdentity = readFileSync(join(agent, "bin/firstmate"), "utf8").replace(stackIdentity(root), "a-different-release");
  writeFileSync(join(agent, "bin/firstmate"), oldIdentity);
  assert.throws(() => preflight(root, agent, run), /review runtime migration/);
  writeFileSync(join(agent, "bin/firstmate"), launcher);
  const corruptAgent = join(temp, "corrupt-agent");
  corrupt = true;
  const before = calls.length;
  assert.throws(() => installStack(root, corruptAgent, run), /Checksum mismatch/);
  assert.ok(!calls.slice(before).some(([command, ...args]) => command === "uv" && args[0] === "venv"));
  assert.throws(() => installStack(root, corruptAgent, run), /incomplete/);
  assert.ok(!existsSync(join(corruptAgent, "bin/firstmate")), "Failed build must not activate launchers");
  corrupt = false;
  const dirtyAgent = join(temp, "dirty-agent");
  dirty = true;
  assert.throws(() => installStack(root, dirtyAgent, run), /Modified tracked Firstmate/);
  assert.ok(!existsSync(join(dirtyAgent, "stack", stackIdentity(root), "complete.json")), "Failed final verification must not publish a complete marker");
  assert.ok(!existsSync(join(dirtyAgent, "bin/firstmate")), "Failed final verification must not activate launchers");
  dirty = false;
  const privateAgent = join(temp, "private-agent");
  mkdirSync(join(privateAgent, "bin"), { recursive: true });
  writeFileSync(join(privateAgent, "bin/firstmate"), "PRIVATE LAUNCHER");
  assert.throws(() => preflight(root, privateAgent, run), /unrelated launcher/);
  assert.equal(readFileSync(join(privateAgent, "bin/firstmate"), "utf8"), "PRIVATE LAUNCHER");
  const brokenAgent = join(temp, "broken-agent");
  mkdirSync(join(brokenAgent, "bin"), { recursive: true });
  symlinkSync(join(temp, "missing-private-target"), join(brokenAgent, "bin/firstmate"));
  assert.throws(() => preflight(root, brokenAgent, run), /unrelated launcher/);
  assert.ok(!existsSync(join(temp, "missing-private-target")));
  const linkedAgent = join(temp, "linked-agent");
  mkdirSync(linkedAgent);
  symlinkSync(unrelated, join(linkedAgent, "stack"));
  assert.throws(() => preflight(root, linkedAgent, run), /unsafe stack store/);
  assert.equal(readFileSync(join(unrelated, "fleet-state"), "utf8"), "KEEP PRIVATE STATE\n");
  console.log("PASS offline stack bootstrap: exact revisions, checksum-before-install, no agent launch, repeat/dirty/incomplete/link/private refusal and retained independent data (mocked downloads/installers)");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
