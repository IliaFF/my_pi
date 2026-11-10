#!/usr/bin/env node
// Retire only recognized shipped content; private neighbors are not migration targets.
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const known = JSON.parse(readFileSync(join(root, "configs/retired-profile.json"), "utf8"));
const jev = "extensions/jev-review";
const present = path => lstatSync(path, { throwIfNoEntry: false });

function checkPath(path) {
  for (let current = resolve(path); ; current = dirname(current)) {
    if (present(current)?.isSymbolicLink()) throw new Error(`Refusing linked migration destination: ${current}`);
    if (dirname(current) === current) break;
  }
}

function migratedAppend(text) {
  const headings = [...text.matchAll(/^# .*?(?:\r?\n|$)/gm)];
  const removals = [];
  for (let i = 0; i < headings.length; i++) {
    if (!/^# (Long-lived delegation|Delegation)\b/.test(headings[i][0])) continue;
    const start = headings[i].index, end = headings[i + 1]?.index ?? text.length;
    const section = text.slice(start, end).replaceAll("\r\n", "\n").trimEnd();
    if (!known.sections.includes(section)) throw new Error("Unknown modified legacy APPEND section; preserve and review it before installation");
    removals.push([start, end]);
  }
  let result = text;
  for (const [start, end] of removals.reverse()) result = result.slice(0, start) + result.slice(end);
  if (/^## Terminal default execution workflow\b/m.test(result) || result.includes("Use DeepSeek `terminal` as the default executor")) {
    throw new Error("Unrecognized terminal routing in APPEND; preserve and review it before installation");
  }
  return result;
}

function inspectProfile(agent) {
  agent = resolve(agent);
  const files = [];
  for (const name of ["APPEND_SYSTEM.md", "settings.json", ...Object.keys(known.files)]) checkPath(join(agent, name));
  const appendPath = join(agent, "APPEND_SYSTEM.md");
  const appendStat = present(appendPath);
  if (appendStat && !appendStat.isFile()) throw new Error("APPEND_SYSTEM.md must be a regular file");
  const before = appendStat ? readFileSync(appendPath, "utf8") : undefined;
  const after = before === undefined ? undefined : migratedAppend(before);
  const validateFile = name => {
    const path = join(agent, name), stat = present(path);
    if (!stat) return;
    if (!stat.isFile()) throw new Error(`Refusing non-regular retired file: ${name}`);
    const hash = createHash("sha256").update(readFileSync(path)).digest("hex");
    if (!known.files[name]?.includes(hash)) throw new Error(`Unknown modified retired file: ${name}; preserve and review before installation`);
    files.push(name);
  };
  for (const name of Object.keys(known.files).filter(name => !name.startsWith(jev + "/"))) validateFile(name);
  const walkJev = name => {
    const stat = present(join(agent, name));
    if (!stat) return;
    if (stat.isSymbolicLink()) throw new Error(`Refusing linked retired file: ${name}`);
    if (stat.isDirectory()) {
      if (name !== jev) throw new Error(`Unknown retired directory: ${name}`);
      for (const entry of readdirSync(join(agent, name))) walkJev(name + "/" + entry);
    } else validateFile(name);
  };
  walkJev(jev);
  return { files, before, after, jevPresent: !!present(join(agent, jev)) };
}

function migrateProfile(agent, backup) {
  agent = resolve(agent);
  const plan = inspectProfile(agent);
  const state = JSON.parse(readFileSync(join(backup, "state.json"), "utf8"));
  if (resolve(state.agentDir) !== agent || !present(join(backup, "agent-files.tar.gz"))?.isFile()) throw new Error("Migration requires this profile's installer backup");
  const changed = [...plan.files, ...(plan.before !== plan.after ? ["APPEND_SYSTEM.md"] : []), ...(plan.jevPresent ? [jev] : [])];
  for (const name of changed) {
    if (!state.agentManaged?.some(root => name === root || name.startsWith(root + "/"))
        || !state.agentPresent?.some(root => name === root || name.startsWith(root + "/"))) {
      throw new Error(`Retired destination is not covered by backup: ${name}`);
    }
  }
  for (const name of plan.files.filter(name => !name.startsWith(jev + "/"))) unlinkSync(join(agent, name));
  if (plan.jevPresent) rmSync(join(agent, jev), { recursive: true });
  if (plan.before !== plan.after) writeFileSync(join(agent, "APPEND_SYSTEM.md"), plan.after);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [agent, mode, backup] = process.argv.slice(2);
    if (!agent || !["--check", "--apply"].includes(mode) || (mode === "--apply" && !backup)) throw new Error("Usage: migrate-retired-profile.mjs AGENT --check | AGENT --apply BACKUP");
    if (mode === "--check") inspectProfile(agent);
    else migrateProfile(agent, backup);
    console.log(`PASS retired-profile ${mode.slice(2)}`);
  } catch (error) {
    console.error(`FAIL ${error.message}`);
    process.exitCode = 1;
  }
}
