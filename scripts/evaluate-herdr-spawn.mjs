// Opt-in real Herdr/Pi integration. Only synthetic loopback model replies.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

assert.ok(process.argv[2], 'Usage: node scripts/evaluate-herdr-spawn.mjs PINNED_HERDR_CHECKOUT');
const candidate = resolve(process.argv[2]);
assert.equal(execFileSync('git', ['-C', candidate, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  '8864764e65a469f7d90f9a0deb39ec3f0b26befc');
assert.equal(execFileSync('git', ['-C', candidate, 'status', '--porcelain'], { encoding: 'utf8' }).trim(),
  '', 'Candidate source must be clean');
const { createLabRoot, startLabServer, stopLabServer, removeLabRoot, HERDR_BIN } =
  await import(pathToFileURL(join(candidate, 'test/integration/herdr-lab.ts')));
const piCli = realpathSync(execFileSync('sh', ['-c', 'command -v pi'], { encoding: 'utf8' }).trim());
const modules = resolve('npm/node_modules');
const parentSession = 'parent.jsonl';
const requests = [];
const handled = new Set();
let target;
let lab;
let provider;
let childSession;
let childPane;
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const entries = path => existsSync(path) ? readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
const waitFor = async (read, predicate, label, timeout = 25000) => {
  const until = Date.now() + timeout;
  while (true) {
    const result = await read();
    if (predicate(result)) return result;
    if (Date.now() >= until) throw new Error(`Timeout: ${label}`);
    await delay(100);
  }
};
const response = (res, model, text, tool) => {
  res.writeHead(200, { 'content-type': 'text/event-stream' });
  const delta = tool ? { role: 'assistant', tool_calls: [{ index: 0, id: `call_${requests.length}`,
    type: 'function', function: { name: tool.name, arguments: JSON.stringify(tool.args) } }] }
    : { role: 'assistant', content: text };
  for (const [part, finish] of [[delta, null], [{}, tool ? 'tool_calls' : 'stop']]) {
    res.write(`data: ${JSON.stringify({ id: 'lab', object: 'chat.completion.chunk', created: 1, model,
      choices: [{ index: 0, delta: part, finish_reason: finish }] })}\n\n`);
  }
  res.end('data: [DONE]\n\n');
};
const expectedTools = ['recall_folded', 'context_search', 'context_get'];
try {
  provider = createServer(async (req, res) => {
    try {
      assert.equal(req.url, '/v1/chat/completions');
      const chunks = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        assert.ok(bytes < 4 * 1024 * 1024, 'Fixture request limit');
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString());
      const tools = (body.tools ?? []).map(tool => tool.function.name);
      const source = JSON.stringify(body.messages);
      requests.push({ model: body.model, tools, hasIndex: source.includes('deterministic seed index') });
      if (body.model === 'child') {
        for (const tool of expectedTools) assert.ok(tools.includes(tool), `Child lacks ${tool}`);
        const phase = [...source.matchAll(/LAB_CHILD_PHASE_(ONE|TWO|THREE)/g)].at(-1)?.[1];
        assert.ok(phase, 'Child task marker missing');
        if (phase === 'THREE') assert.ok(source.includes('deterministic seed index'), 'No compacted context in phase 3');
        response(res, body.model, `CHILD_${phase}_OK\n${phase === 'THREE' ? '' : 'x'.repeat(100000)}`);
        return;
      }
      assert.equal(body.model, 'parent');
      const user = [...(body.messages ?? [])].reverse().find(message => message.role === 'user');
      const command = JSON.stringify(user?.content ?? '').match(/LAB_PARENT_(START|TWO|THREE|STOP)/)?.[1];
      if (!command || handled.has(command) || body.messages.at(-1)?.role === 'tool') {
        response(res, body.model, 'PARENT_IDLE');
        return;
      }
      handled.add(command);
      const name = 'context-specialist';
      const tool = command === 'START'
        ? { name: 'subagent', args: { name, task: 'LAB_CHILD_PHASE_ONE', persistent: true,
            model: 'lab/child', cwd: lab.root } }
        : command === 'STOP' ? { name: 'subagent_stop', args: { name } }
          : { name: 'subagent_send', args: { name, message: `LAB_CHILD_PHASE_${command}` } };
      response(res, body.model, '', tool);
    } catch (error) {
      requests.push({ error: String(error) });
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: String(error) } }));
    }
  });
  await new Promise(resolve => provider.listen(0, '127.0.0.1', resolve));
  const port = provider.address().port;
  lab = createLabRoot(`onboarding = false\n[terminal]\ndefault_shell = "/bin/bash"\nshell_mode = "non_login"\n[update]\nversion_check = false\nmanifest_check = false\n[experimental]\nallow_nested = true\n[ui.sound]\nenabled = false\n[server]\nheadless_cols = 170\nheadless_rows = 60\n`);
  const bin = join(lab.root, 'bin');
  mkdirSync(bin);
  const agent = join(lab.home, '.pi/agent');
  mkdirSync(join(agent, 'extensions'), { recursive: true });
  mkdirSync(join(agent, 'herdr-agents'), { recursive: true });
  // Both binaries and --offline are explicit; no user shell startup or credentials.
  writeFileSync(join(bin, 'pi'), `#!/bin/bash\nexec ${quote(process.execPath)} ${quote(piCli)} --offline --no-mcp "$@"\n`, { mode: 0o700 });
  writeFileSync(join(bin, 'herdr'), `#!/bin/bash\nexec ${quote(HERDR_BIN)} "$@"\n`, { mode: 0o700 });
  lab.env.PATH = `${bin}:${dirname(process.execPath)}:/usr/bin:/bin`;
  lab.env.PI_OFFLINE = '1';
  lab.env.PI_CODING_AGENT_DIR = agent;
  const extension = join(candidate, 'pi-extension/subagents/index.ts');
  writeFileSync(join(agent, 'settings.json'), JSON.stringify({
    packages: [], extensions: [extension, join(modules, 'context-fold/index.ts'),
      resolve('local-extensions/auto-ultra-compact/index.ts'), join(modules, '@spences10/pi-context/dist/index.js')],
    defaultProvider: 'lab', defaultModel: 'parent', defaultThinkingLevel: 'off',
    retry: { enabled: false }, compaction: { enabled: true, reserveTokens: 12500, keepRecentTokens: 12000 },
  }));
  writeFileSync(join(agent, 'herdr-agents/config.json'), JSON.stringify({ status: { enabled: true },
    sidebar: { enabled: true }, persistent: { maxAgents: 1 }, supervision: { forcePolling: true, hangWarningMinutes: 15 } }));
  writeFileSync(join(agent, 'models.json'), JSON.stringify({ providers: { lab: {
    api: 'openai-completions', baseUrl: `http://127.0.0.1:${port}/v1`, apiKey: 'lab-only',
    compat: { supportsDeveloperRole: false, supportsReasoningEffort: false, supportsUsageInStreaming: false },
    models: ['parent', 'child'].map(id => ({ id, name: id, reasoning: false, input: ['text'],
      contextWindow: 200000, maxTokens: 40000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } })),
  } } }));
  execFileSync(HERDR_BIN, ['integration', 'install', 'pi'], { env: lab.env, encoding: 'utf8' });
  target = await startLabServer(lab, 'context-spawn');
  await target.ok('plugin.link', { path: join(candidate, 'plugins/sidebar'), enabled: true });
  const created = await target.ok('workspace.create', { cwd: lab.root, label: 'context-lab', focus: false });
  const parentPane = created.root_pane.pane_id;
  const file = join(lab.root, parentSession);
  const run = `${quote(join(bin, 'pi'))} --model lab/parent --session ${quote(file)} LAB_PARENT_START`;
  target.cli(['pane', 'run', parentPane, run]);
  const results = () => entries(file).filter(entry => entry.type === 'custom_message' && entry.customType === 'subagent_result');
  await waitFor(results, rows => rows.length === 1, 'first result');
  childSession = results()[0].details.sessionFile;
  assert.ok(childSession && existsSync(childSession));
  assert.ok(realpathSync(childSession).startsWith(`${realpathSync(lab.root)}/`), 'Child session escaped the lab');
  const panes = await target.ok('pane.list', {});
  const candidates = JSON.stringify(panes);
  assert.ok(candidates.includes('context-specialist'));
  const flat = panes.panes ?? [];
  childPane = flat.find(pane => pane.agent_session === childSession || pane.agent_name === 'context-specialist' || pane.name === 'context-specialist')?.pane_id;
  if (!childPane) {
    for (const pane of flat) {
      const item = (await target.ok('pane.get', { pane_id: pane.pane_id })).pane;
      if (JSON.stringify(item).includes(childSession)) { childPane = pane.pane_id; break; }
    }
  }
  assert.ok(childPane, `No child pane for assigned session: ${candidates.slice(0, 1200)}`);
  await waitFor(async () => (await target.ok('pane.get', { pane_id: childPane })).pane,
    pane => pane.tokens?.piha_delegated_v1 === 'live', 'sidebar child marker');
  const compact = async count => {
    target.cli(['pane', 'send-text', childPane, '/compact']);
    target.cli(['pane', 'send-keys', childPane, 'Enter']);
    const rows = await waitFor(() => entries(childSession).filter(entry => entry.type === 'compaction'),
      rows => rows.length === count, `child compaction ${count}`);
    assert.match(rows.at(-1).summary, /deterministic seed index/);
  };
  await compact(1);
  target.cli(['agent', 'prompt', parentPane, 'LAB_PARENT_TWO']);
  await waitFor(results, rows => rows.length === 2, 'second result');
  assert.equal(results()[1].details.sessionFile, childSession);
  await compact(2);
  target.cli(['agent', 'prompt', parentPane, 'LAB_PARENT_THREE']);
  await waitFor(results, rows => rows.length === 3, 'third result');
  assert.equal(results()[2].details.sessionFile, childSession);
  assert.equal(existsSync(`${childSession}.exit`), false, 'Persistent process must stay alive between tasks');
  assert.equal(new Set(results().map(row => row.details.task)).size, 3);
  for (const row of results()) {
    assert.equal(typeof row.content, 'string');
    assert.ok(row.content.length <= 16000, 'Parent result must be bounded');
  }
  target.cli(['agent', 'prompt', parentPane, 'LAB_PARENT_STOP']);
  const stopped = await waitFor(() => entries(file), rows => rows.some(row => row.type === 'message' &&
    row.message?.role === 'toolResult' && row.message.toolName === 'subagent_stop'), 'stop tool result');
  assert.equal(stopped.findLast(row => row.message?.toolName === 'subagent_stop').message.isError, false);
  await waitFor(async () => JSON.stringify(await target.ok('agent.list', {})),
    text => !text.includes('context-specialist'), 'specialist stopped');
  assert.ok(!requests.some(row => row.error), JSON.stringify(requests.filter(row => row.error)));
  assert.ok(requests.some(row => row.model === 'child' && row.hasIndex));
  assert.equal(requests.filter(row => row.model === 'child').length, 3, 'Compaction must not call the provider');
  console.log(JSON.stringify({ status: 'PASS', actualChild: true, persistentTasks: 3,
    deterministicCompactions: 2, inheritedContextTools: expectedTools, markerVerified: true,
    localRequests: requests.length, externalModelRequests: 0,
    limitation: 'Synthetic responses; no autonomous reasoning, full production profile or live-provider recovery claim.' }));
} catch (error) {
  console.error('FAIL', String(error));
  console.error('Request summary', JSON.stringify(requests));
  if (target && childPane) {
    try { console.error(JSON.stringify(await target.ok('pane.read', { pane_id: childPane, lines: 30 }))); } catch {}
  }
  throw error;
} finally {
  try {
    if (target) await stopLabServer(lab, target);
    if (lab) removeLabRoot(lab);
  } finally {
    provider?.closeAllConnections();
    if (provider) await new Promise(resolve => provider.close(resolve));
  }
}
