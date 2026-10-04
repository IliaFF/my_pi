#!/usr/bin/env node
// Offline regression check. Real Pi session files; fake model and approval UI.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, copyFileSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const installation = resolve(process.argv[2] || join(homedir(), '.pi', 'agent'));
const require = createRequire(join(installation, 'npm/node_modules/@earendil-works/pi-coding-agent/package.json'));
const { createJiti } = require('jiti');
const root = mkdtempSync(join(tmpdir(), 'pi-train-agents-check-'));
const oldAgentDir = process.env.PI_CODING_AGENT_DIR, oldOffline = process.env.PI_OFFLINE;
process.env.PI_CODING_AGENT_DIR = join(root, 'agent');
process.env.PI_OFFLINE = '1';
try {
  const agent = process.env.PI_CODING_AGENT_DIR, data = join(agent, 'train-agents');
  mkdirSync(data, { recursive: true, mode: 0o700 });
  const cfg = { targetFile: 'APPEND_SYSTEM.md', sessionScope: 'all', language: 'en', jobs: 1, minGapEvidence: 2, budgetTokens: 5000 };
  const configPath = join(data, 'config.json');
  const configure = (over = {}) => writeFileSync(configPath, JSON.stringify({ ...cfg, ...over }));
  configure();
  const target = join(agent, 'APPEND_SYSTEM.md');
  const original = '# Global rules\n- Keep confirmations.\n- Avoid redundant repeated repeated repeated repeated repeated repeated repeated repeated repeated repeated wording.\n';
  writeFileSync(target, original, { mode: 0o600 });
  const corePath = join(installation, 'npm/node_modules/@earendil-works/pi-coding-agent/dist/index.js');
  const core = await import(pathToFileURL(corePath).href);
  const jiti = createJiti(import.meta.url, { interopDefault: false, alias: { '@earendil-works/pi-coding-agent': corePath }, nativeModules: [corePath] });
  const ext = await jiti.import(join(installation, 'npm/node_modules/pi-train-agents/dist/train-agents.ts'));
  assert.equal(ext.resolveMemoryFile(root, cfg).primary, target);
  assert.throws(() => ext.resolveMemoryFile(root, { ...cfg, targetFile: null }));
  assert.throws(() => ext.resolveMemoryFile(root, { ...cfg, sessionScope: 'typo' }));
  const projectA = join(root, 'alpha'), projectB = join(root, 'beta');
  mkdirSync(projectA); mkdirSync(projectB);
  const quotes = ['Agent skipped verification in alpha.', 'Agent skipped verification in beta.'];
  const assistant = { role: 'assistant', content: [{ type: 'text', text: 'Done.' }], api: 'openai-responses', provider: 'mock', model: 'test', stopReason: 'stop', timestamp: Date.now(), usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } };
  function session(cwd, quote) {
    const s = core.SessionManager.create(cwd);
    s.appendMessage({ role: 'user', content: quote, timestamp: Date.now() });
    s.appendMessage(assistant);
    s.appendMessage({ role: 'user', content: 'Please verify the result.', timestamp: Date.now() });
    return s;
  }
  const a = session(projectA, quotes[0]), b = session(projectB, quotes[1]), active = session(projectA, 'ACTIVE SESSION MUST NOT BE ANALYZED');
  // A copied session must not become a second independent source.
  copyFileSync(a.getSessionFile(), join(dirname(b.getSessionFile()), 'copied-session.jsonl'));
  const sources = [a.getSessionId(), b.getSessionId()];
  const evidence = sources.map((source, i) => ({ source, text: quotes[i] }));
  const edit = { id: 'e1', kind: 'add', title: 'Verify results', replace: '- Verify changes before reporting success.', transcripts: 2, evidence };
  const index = new Map(sources.map((s, i) => [s, [quotes[i]]]));
  const tokens = (s) => Math.ceil(Buffer.byteLength(s) / 4);
  const gate = (e) => ext.validateProposal([e], original, tokens(original), cfg, index);
  assert.equal(gate(edit).ok, true);
  assert.equal(gate({ ...edit, evidence: [evidence[0], { source: sources[1], text: 'Completely fabricated evidence.' }] }).ok, false);
  assert.equal(gate({ ...edit, evidence: [evidence[0], { source: sources[1], text: quotes[0] }] }).ok, false);
  assert.equal(gate({ ...edit, evidence: [evidence[0], evidence[0]] }).ok, false);
  assert.equal(gate({ ...edit, evidence: [evidence[0], { source: 'invented', text: quotes[1] }] }).ok, false);
  const messages = [], notices = [], calls = [];
  let command;
  ext.default({ registerCommand: (name, c) => { assert.equal(name, 'train-agents'); command = c; }, sendMessage: (m) => messages.push(m.content) });
  let allCalls = 0, projectCalls = 0;
  const listAll = core.SessionManager.listAll, list = core.SessionManager.list;
  core.SessionManager.listAll = async (...args) => { allCalls++; return listAll.apply(core.SessionManager, args); };
  core.SessionManager.list = async (...args) => { projectCalls++; return list.apply(core.SessionManager, args); };
  const ctx = {
    cwd: projectA, mode: 'rpc', hasUI: true, sessionManager: active,
    model: { provider: 'mock', id: 'test', api: 'openai-responses' },
    modelRegistry: {
      hasConfiguredAuth: () => true,
      complete: async (_model, context, options) => {
        calls.push(options.sessionId);
        const prompt = context.messages[0].content[0].text;
        if (JSON.parse(readFileSync(configPath)).targetFile) assert.ok(prompt.includes('GLOBAL rules file'));
        let result;
        if (options.sessionId === 'train-agents-analysis') {
          const quote = quotes.find((q) => prompt.includes(q));
          assert.ok(quote, 'Only the two completed fixture sessions may reach analysis');
          result = { units: [], gaps: [{ topic: 'test', proposedInstruction: 'Verify results', mistake: 'Skipped verification', quote, recurrenceRisk: 'high' }] };
        } else {
          for (const source of sources) assert.ok(prompt.includes(source));
          for (const project of [projectA, projectB]) assert.ok(prompt.includes(project));
          result = { edits: [edit] };
        }
        return { stopReason: 'stop', content: [{ type: 'text', text: JSON.stringify(result) }] };
      },
    },
    ui: { notify: (text, level) => notices.push({ text, level }), confirm: async () => false, input: async () => '' },
  };
  const run = async (args, context = ctx) => {
    const before = notices.length;
    await command.handler(args, context);
    assert.ok(!notices.slice(before).some((n) => n.text.startsWith('train-agents:')), JSON.stringify(notices.slice(before)));
  };
  await run('analyze');
  assert.equal(allCalls, 1); assert.equal(projectCalls, 0);
  assert.equal(calls.length, 2, 'Active and copied sessions excluded');
  assert.equal(readFileSync(target, 'utf8'), original);
  const statePath = join(data, readdirSync(data).find((p) => p.endsWith('.state.json')));
  const state = JSON.parse(readFileSync(statePath));
  assert.equal(state.evidence.length, 2);
  assert.deepEqual(new Set(state.evidence.map((r) => r.project)), new Set([projectA, projectB]));
  await run('analyze', { ...ctx, cwd: projectB });
  assert.equal(calls.length, 2, 'All-project cache shared across calling projects');
  await run('propose');
  assert.equal(calls.length, 3);
  assert.equal(readFileSync(target, 'utf8'), original, 'Propose never writes rules');
  const proposalPath = join(data, readdirSync(data).find((p) => p.endsWith('.proposal.json')));
  const proposal = JSON.parse(readFileSync(proposalPath));
  assert.equal(proposal.memoryFile, target); assert.equal(proposal.sessionScope, 'all');
  assert.deepEqual(proposal.edits[0].evidence.map((e) => e.project), [projectA, projectB]);
  const rejectionPath = proposalPath.replace('.proposal.json', '.rejections.json');
  function reset() {
    configure(); writeFileSync(target, original);
    writeFileSync(proposalPath, JSON.stringify(proposal)); writeFileSync(rejectionPath, '[]');
  }
  await run('review', { ...ctx, hasUI: false });
  assert.equal(readFileSync(target, 'utf8'), original);
  await run('review');
  assert.equal(readFileSync(target, 'utf8'), original, 'Reject never writes rules');
  reset();
  ctx.ui.confirm = async () => { writeFileSync(target, original + 'External change\n'); return true; };
  await run('review');
  assert.equal(readFileSync(target, 'utf8'), original + 'External change\n', 'External edits survive review');
  reset();
  writeFileSync(proposalPath, JSON.stringify({ ...proposal, memoryFile: join(projectA, 'AGENTS.md') }));
  ctx.ui.confirm = async () => { assert.fail('Wrong target must not reach confirmation'); };
  await run('review');
  assert.equal(readFileSync(target, 'utf8'), original);
  reset(); ctx.ui.confirm = async () => true;
  writeFileSync(proposalPath, JSON.stringify({ ...proposal, edits: [{ ...edit, evidence: [evidence[0], { source: sources[1], text: quotes[0] }] }] }));
  await run('review');
  assert.equal(readFileSync(target, 'utf8'), original, 'Review revalidates source binding');
  reset(); configure({ budgetTokens: tokens(original) });
  const remove = { ...edit, id: 'e2', kind: 'remove', title: 'Remove redundancy', find: '- Avoid redundant repeated repeated repeated repeated repeated repeated repeated repeated repeated repeated wording.', replace: '' };
  assert.equal(ext.validateProposal([remove, edit], original, tokens(original), { ...cfg, budgetTokens: tokens(original) }, index).ok, true);
  writeFileSync(proposalPath, JSON.stringify({ ...proposal, edits: [remove, edit] }));
  ctx.ui.confirm = async (title) => !title.includes('Remove redundancy');
  await run('review');
  assert.equal(readFileSync(target, 'utf8'), original, 'Accepted subset must still fit budget');
  reset(); ctx.ui.confirm = async () => true;
  const mode = statSync(target).mode & 0o777;
  await run('review', { ...ctx, cwd: projectB });
  assert.ok(readFileSync(target, 'utf8').includes(edit.replace));
  assert.equal(statSync(target).mode & 0o777, mode);
  assert.ok(!readdirSync(data).includes(proposalPath.split('/').pop()));
  const backups = readdirSync(data).filter((p) => p.includes('.backup-'));
  assert.equal(backups.length, 1); assert.equal(readFileSync(join(data, backups[0]), 'utf8'), original);
  assert.ok(!readdirSync(agent).some((p) => p.endsWith('.tmp')));
  assert.equal(calls.length, 3, 'Review/status make no model calls');
  await run('status');
  assert.ok(messages.at(-1).includes('Session scope: all'));
  writeFileSync(join(projectA, 'AGENTS.md'), original);
  configure({ targetFile: null, sessionScope: 'project', memoryFiles: ['AGENTS.md'] });
  await run('analyze');
  assert.equal(projectCalls, 1); assert.equal(calls.length, 4, 'Project scope remains supported');
  console.log('PASS: source-bound quotes; all-project discovery/cache; active/copy exclusion; project fallback; propose/headless/reject guards; target/freshness/budget guards; approved atomic write/backup/mode. No real provider calls.');
} finally {
  if (oldAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR; else process.env.PI_CODING_AGENT_DIR = oldAgentDir;
  if (oldOffline === undefined) delete process.env.PI_OFFLINE; else process.env.PI_OFFLINE = oldOffline;
  rmSync(root, { recursive: true, force: true });
}
