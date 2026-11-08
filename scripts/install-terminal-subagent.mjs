#!/usr/bin/env node
// Install only the approved specialist; preserve unrelated personal settings.
import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function installTerminal(agent, source) {
  const settingsPath = join(agent, 'settings.json');
  const baseline = JSON.parse(readFileSync(join(source, 'configs/settings.json'), 'utf8'));
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  const entry = baseline.packages.find(item => item.source === 'npm:pi-subagents@0.87.0');
  const files = [['agents/terminal.md', 'configs/agents/terminal.md'],
    ['extensions/subagent/config.json', 'configs/subagent/config.json']];
  // Validate every destination before changing any file, including linked ancestors.
  for (const relative of ['settings.json', ...files.map(([path]) => path)]) {
    let path = agent;
    for (const part of relative.split('/')) {
      path = join(path, part);
      try {
        assert.ok(!lstatSync(path).isSymbolicLink(), `FAIL linked terminal destination: ${path}`);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }
  const merged = { ...settings.subagents };
  for (const [key, value] of Object.entries(baseline.subagents)) {
    if (key in merged) assert.deepEqual(merged[key], value, `FAIL conflicting subagents.${key}`);
    merged[key] = value;
  }
  for (const [destination, snapshot] of files) {
    const target = join(agent, destination), bytes = readFileSync(join(source, snapshot));
    if (existsSync(target)) assert.ok(readFileSync(target).equals(bytes), `FAIL conflicting terminal file: ${target}`);
  }
  const packages = settings.packages ?? [];
  const isSubagents = item => /^npm:pi-subagents(?:@|$)/.test(typeof item === 'string' ? item : item.source ?? '');
  const existing = packages.filter(isSubagents);
  assert.ok(existing.length <= 1, 'FAIL duplicate pi-subagents packages');
  if (existing.length) assert.deepEqual(existing[0], entry, 'FAIL conflicting pi-subagents package filters');
  settings.packages = existing.length ? packages : [...packages, entry];
  settings.subagents = merged;
  for (const [destination, snapshot] of files) {
    const target = join(agent, destination);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(join(source, snapshot)));
  }
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  installTerminal(resolve(process.argv[2]), resolve(process.argv[3]));
}
