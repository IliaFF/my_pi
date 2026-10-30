#!/usr/bin/env node
// Static UTF-8 component sizes, not provider tokens, runtime speed or quality.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const source = resolve(process.argv[2] ?? ".");
const modules = join(source, "npm/node_modules");
const { loadSkillsFromDir, formatSkillsForPrompt } = await import(pathToFileURL(join(modules, "@earendil-works/pi-coding-agent/dist/core/skills.js")));
const { skills, diagnostics } = loadSkillsFromDir({ dir: join(modules, "@dietrichgebert/ponytail/skills"), source: "measurement" });
assert.deepEqual(diagnostics, []);
// Normalize locations so temporary/check-out path length cannot masquerade as savings.
const normalized = skills.filter(skill => skill.name !== "ponytail").map(skill => ({
  ...skill, filePath: `/fixture/skills/${skill.name}/SKILL.md`,
}));
const background = readFileSync(join(modules, "pi-background-tasks/dist/src/extension.js"), "utf8");
const guidelines = {};
for (const name of ["bg_run", "bg_status", "bg_logs", "bg_kill"]) {
  const start = background.indexOf(`name: '${name}'`);
  assert.ok(start >= 0);
  const block = background.slice(start).match(/promptGuidelines: \[([\s\S]*?)\n\s*\]/)?.[1];
  assert.ok(block, `${name}: guidelines must exist`);
  const lines = [...block.matchAll(/^\s*'([^\n]*)',\s*$/gm)].map(match => match[1]);
  assert.ok(lines.length > 0);
  guidelines[name] = lines;
}
const bytes = value => Buffer.byteLength(value, "utf8");
console.log(JSON.stringify({
  scope: "Static components only; normalized skill paths; active base skill excluded in both cases",
  appendBytes: bytes(readFileSync(join(source, "configs/APPEND_SYSTEM.md"), "utf8")),
  ponytailAdvertisementBytes: bytes(formatSkillsForPrompt(normalized)),
  visiblePonytailSkills: normalized.filter(skill => !skill.disableModelInvocation).map(skill => skill.name).sort(),
  backgroundGuidelinesJsonBytes: bytes(JSON.stringify(guidelines)),
  backgroundGuidelineCount: Object.values(guidelines).flat().length,
}, null, 2));
