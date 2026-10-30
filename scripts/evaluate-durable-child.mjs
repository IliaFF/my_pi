// Explicit faux-provider characterization of the pinned Durable child's own compaction.
import './no-network.cjs';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const candidate = resolve(process.argv[2] ?? '');
assert.ok(process.argv[2], 'Usage: node scripts/evaluate-durable-child.mjs CANDIDATE_CHECKOUT');
const entry = path => pathToFileURL(join(candidate, path));
const { openRuntime, context } = await import(entry('src/runtime.ts'));
const { createModels, fauxProvider, fauxAssistantMessage } = await import(entry('node_modules/@earendil-works/pi-ai/dist/index.js'));
const fixture = mkdtempSync(join(tmpdir(), 'pi-durable-child-context-'));
const faux = fauxProvider({ models: [{ id: 'probe', contextWindow: 1000000, maxTokens: 4096 }] });
const models = createModels();
models.setProvider(faux.provider);
const options = { directory: fixture, parentSession: 'offline-multiwindow', models };
let runtime;
const deadline = setTimeout(() => { console.error('FAIL Durable child deadline'); process.exit(124); }, 45000);
const token = 'GOAL_BOUNDARY_NO_DEPLOY';
const configuration = {
  role: 'Explore', model: { provider: faux.getModel().provider, modelId: 'probe' },
  thinking: 'off', instructions: `Keep ${token}`, tools: ['read'], cwd: fixture,
  project: fixture, isolation: 'off', history: '',
};
let summaryCalls = 0;
try {
  runtime = await openRuntime(options);
  let task;
  for (const cycle of [1, 2]) {
    for (const turn of [1, 2, 3, 4]) {
      faux.setResponses([(_transcript, _options, _state, _model) => fauxAssistantMessage('x'.repeat(30000))]);
      const message = `Cycle ${cycle}, turn ${turn}. ${token}\n${'y'.repeat(30000)}`;
      task = cycle === 1 && turn === 1
        ? await runtime.start({ requestId: 'child', name: 'child', description: 'Offline child',
            message, background: true, configuration })
        : await runtime.send({ id: 'child', requestId: `${cycle}-${turn}`, message, followUp: true });
      assert.equal((await runtime.wait(task)).status, 'completed');
    }
    const child = await runtime.conversation(await runtime.get('child'));
    faux.setResponses([(transcript) => {
      summaryCalls++;
      assert.ok(JSON.stringify(transcript).includes('structured context checkpoint summary'));
      return fauxAssistantMessage(`## Goal\n${token}\n## Progress\nCycle ${cycle} complete`);
    }]);
    const compact = await child.compact(undefined, context);
    const result = await runtime.harness.waitForTask(compact, context);
    assert.equal(result.state.outcome.status, 'completed');
    assert.ok(result.state.outcome.result.submissionId, 'Compaction must place a summary');
    assert.ok(JSON.stringify(await child.context(context)).includes(`Cycle ${cycle} complete`));
  }
  const before = await runtime.get('child');
  assert.equal(summaryCalls, 2, 'Default child compaction calls the model, unlike our deterministic index');
  await runtime.close();
  runtime = await openRuntime(options);
  assert.equal((await runtime.get('child')).conversationId, before.conversationId);
  faux.setResponses([(transcript) => {
    assert.ok(JSON.stringify(transcript).includes(token));
    assert.ok(JSON.stringify(transcript).includes('Cycle 2 complete'), 'Reopened model input must contain the latest summary');
    const names = [...new Set(transcript.messages.flatMap(message =>
      (message.toolsAdded ?? []).map(tool => tool.name)))];
    assert.deepEqual(names, ['read']);
    return fauxAssistantMessage('CONTINUED_AFTER_TWO_COMPACTIONS_AND_REOPEN');
  }]);
  const followUp = await runtime.send({ id: 'child', requestId: 'after-reopen', message: 'Continue', followUp: true });
  assert.equal((await runtime.wait(followUp)).text, 'CONTINUED_AFTER_TWO_COMPACTIONS_AND_REOPEN');
  console.log(JSON.stringify({ status: 'PASS', childCompactions: 2, fauxSummaryCalls: summaryCalls,
    reopenedSameChild: true, childTools: ['read'],
    limitation: 'Summary preservation is scripted by a faux provider, not proof of real reasoning or our context-stack equivalence.' }));
} finally {
  clearTimeout(deadline);
  await runtime?.close();
  rmSync(fixture, { recursive: true, force: true });
}
