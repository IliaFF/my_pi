#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installTerminal } from './install-terminal-subagent.mjs';

const root = mkdtempSync(join(tmpdir(), 'pi-terminal-install-'));
const source = process.cwd();
const original = { defaultProvider: 'openai', defaultModel: 'gpt-6.1-sol', packages: ['npm:other'], custom: { keep: true } };
try {
  const agent = join(root, 'agent'); mkdirSync(agent);
  const path = join(agent, 'settings.json');
  writeFileSync(path, JSON.stringify(original));
  installTerminal(agent, source);
  const installed = JSON.parse(readFileSync(path));
  assert.deepEqual({ ...installed, packages: original.packages, subagents: undefined }, { ...original, subagents: undefined });
  assert.deepEqual(installed.packages[0], original.packages[0]);
  assert.deepEqual(installed.packages[1], { source: 'npm:pi-subagents@0.87.0', skills: [], prompts: [] });
  const first = readFileSync(path);
  installTerminal(agent, source); assert.ok(readFileSync(path).equals(first));
  for (const [target, snapshot] of [['agents/terminal.md', 'configs/agents/terminal.md'], ['extensions/subagent/config.json', 'configs/subagent/config.json']]) {
    assert.ok(readFileSync(join(agent, target)).equals(readFileSync(join(source, snapshot))));
    const bytes = readFileSync(join(agent, target));
    writeFileSync(join(agent, target), 'custom');
    assert.throws(() => installTerminal(agent, source), /conflicting terminal file/);
    assert.ok(readFileSync(path).equals(first));
    writeFileSync(join(agent, target), bytes);
  }
  writeFileSync(path, JSON.stringify({ ...original, subagents: { disableBuiltins: false } }));
  assert.throws(() => installTerminal(agent, source), /conflicting subagents/);
  writeFileSync(path, JSON.stringify({ ...original, packages: ['npm:pi-subagents@0.87.0'] }));
  assert.throws(() => installTerminal(agent, source), /conflicting pi-subagents package filters/);
  writeFileSync(path, JSON.stringify(original));
  rmSync(join(agent, 'agents'), { recursive: true });
  const outside = join(root, 'outside'); mkdirSync(outside);
  symlinkSync(outside, join(agent, 'agents'));
  assert.throws(() => installTerminal(agent, source), /linked terminal destination/);
  assert.equal(readFileSync(path, 'utf8'), JSON.stringify(original));
  console.log('PASS terminal install: preservation, idempotence, byte equality, conflicts and linked destinations');
} finally {
  rmSync(root, { recursive: true, force: true });
}
