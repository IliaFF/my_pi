// Offline regression for the versioned context-fold patch, not a semantic-summary test.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const modules = resolve(process.argv[2] || 'npm/node_modules');
const { createJiti } = await import(pathToFileURL(join(modules, '@earendil-works/pi-coding-agent/dist/core/extensions/jiti-loader.js')));
const jiti = createJiti(import.meta.url);
const { extractIndex, extractCompactionIndex } = await jiti.import(join(modules, 'context-fold/src/core/index/seed-index.ts'));
const request = 'Implement training.\nDo not start GPU without approval.';
const restore = 'После автосжатия сначала прочитай текущий TODO.md в корне проекта, если продолжаешь многошаговую проектную работу: только он определяет отслеживаемую задачу и следующий шаг. Для такой работы при недоступном TODO.md или неясной задаче остановись и спроси пользователя. Обсуждения и мелкие одношаговые правки не требуют отдельной записи в TODO.md. Для прочих деталей используй compact summary, файлы проекта и точечное восстановление истории через recall_folded.';
const queued = '[TODO QUEUE task123]\nЭто кандидат из Pending, ещё не взятый в работу.\n\nValidate the archived specifications.\nDo not publish yet.\n\nПосле claim используй настоящий id из результата инструмента, не placeholder кандидата.';
const inputs = [request, restore, queued, 'После автосжатия обсудим формат отчёта.', '[TODO QUEUE quoted]\nThis is a user quotation, not the full owned envelope.'];
const blocks = inputs.map((text, i) => ({ id: `u${i}`, kind: 'user', text, turn: i + 1, order: i, tokens: text.length / 4 }));
const result = { id: 'r', kind: 'tool_result', text: 'PASS', toolName: 'bash', turn: 1, order: 6, tokens: 1 };
const end = { ...result, id: 'r-end', turn: 5, order: 7 };
const expected = [request.split('\n')[0], 'Validate the archived specifications.', inputs[3], inputs[4].split('\n')[0]];
for (const index of [extractIndex({ masked: [result, end], all: [...blocks, result, end] }), extractCompactionIndex([...blocks, result, end])]) {
  assert.deepEqual(index.userMessages.map(u => u.firstLine), expected);
  assert.deepEqual(index.userMessages.map(u => u.turn), [1, 3, 4, 5]);
  // Characterization: later-line restrictions are not preserved by a first-line index.
  assert.ok(!index.userMessages.some(u => u.firstLine.includes('Do not start GPU')));
  assert.ok(!index.userMessages.some(u => u.firstLine.includes('Do not publish yet')));
}
assert.equal(inputs[0], request, 'Index extraction must not modify original messages');
execFileSync(process.execPath, ['--require', './scripts/no-network.cjs', 'scripts/test-auto-ultra-compact.mjs'], {
  env: { ...process.env, PI_CODING_AGENT_DIR: process.env.PI_CODING_AGENT_DIR ?? resolve(modules, '../..'), PI_TEST_EXPECT_INDEX_PATCH: '1' },
  timeout: 20000, stdio: 'inherit',
});
console.log('PASS soft/hard user intents and actual SDK both load orders: owned control envelopes, queue body, ordinary lookalikes; multiline truncation explicitly characterized');
