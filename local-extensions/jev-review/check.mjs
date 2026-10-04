import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire(realpathSync(execFileSync('which', ['pi'], { encoding: 'utf8' }).trim()));
const { createJiti } = require('jiti');
const { default: extension, redact, evidence, problems, questions, fitState, failureReason } = await createJiti(import.meta.url).import(new URL('./index.ts', import.meta.url).pathname);
const dir = await mkdtemp(join(tmpdir(), 'jev-review-check-'));
let passed = 0;
const result = (probability = 0.01) => ({ stopReason: 'stop', model: 'test', answers: Object.fromEntries(Object.keys(questions).map(id => [id, {type: 'bool', probability}])), usage: {cost: {total: 0.00001}} });
const user = content => ({ role: 'user', content: [{type: 'text', text: content}], timestamp: Date.now() });
let timestamp = 100;
const assistant = content => ({ role: 'assistant', content: [{type: 'text', text: content}], stopReason: 'stop', timestamp: timestamp++ });
function fixture(outcome = result()) {
  const handlers = new Map();
  const commands = new Map();
  const entries = [];
  const requests = [];
  const notices = [];
  let messages = [user('Reply exactly YES'), assistant('YES')];
  const ctx = {
    cwd: dir, hasUI: true, signal: undefined,
    isProjectTrusted: () => true, hasPendingMessages: () => false,
    getSystemPrompt: () => 'Project rule: answer honestly; run tests for code changes.',
    waitForIdle: async () => {},
    ui: {setStatus() {}, notify: (...args) => notices.push(args)},
    sessionManager: {getBranch: () => entries, buildSessionProjection: () => ({messages})},
    modelRegistry: {
      findOfType: () => ({id: 'typesafe/jev-1.13'}),
      classify: async (...args) => { requests.push(args); return typeof outcome === 'function' ? await outcome(...args) : outcome; },
    },
  };
  extension({
    on: (name, handler) => handlers.set(name, handler),
    registerCommand: (name, command) => commands.set(name, command),
    appendEntry: (customType, data) => entries.push({type: 'custom', customType, data}),
    sendMessage: message => entries.push(message),
  });
  const settle = async (extra = {}) => {
    const answer = await handlers.get('agent_before_settle')({outcome: 'completed', entries: [], continue: false, context: {contextMessages: messages, canContinue: true}, ...extra}, ctx);
    for (const entry of answer?.entries ?? []) entries.push(entry);
    return answer;
  };
  const start = async (prompt = 'Reply exactly YES') => {
    await handlers.get('before_agent_start')({prompt}, ctx);
    messages = [user(prompt), assistant('YES')];
  };
  return {handlers, commands, entries, requests, notices, ctx, settle, start, setMessages: value => {messages = value}};
}
async function test(name, run) { await run(); passed++; console.log('PASS', name); }
try {
  await writeFile(join(dir, 'TODO.md'), '# TODO\n## In progress\n- [ ] Test reply\n');
  await test('failure diagnostics exclude provider bodies and secrets', () => {
    assert.equal(failureReason(new Error('HTTP 401 Bearer SECRET_PROVIDER_BODY')), 'HTTP 401');
    assert.equal(failureReason(new Error('ETIMEDOUT SECRET_PROVIDER_BODY')), 'network ETIMEDOUT');
    assert.equal(failureReason(new Error('request timed out')), 'timeout');
    assert.equal(failureReason(new Error('SECRET_PROVIDER_BODY')), 'request failed (details omitted)');
  });
  await test('four dimensions + validation of all answers', () => {
    assert.equal(Object.keys(questions).length, 4);
    assert.deepEqual(problems(result()), []);
    assert.equal(problems(result(0.8)).length, 4);
    assert.equal(problems(result(0.799)).length, 0);
    for (const bad of [NaN, -0.1, 1.1, undefined]) assert.throws(() => problems({...result(), answers: {...result().answers, rules: {type: 'bool', probability: bad}}}));
    assert.throws(() => problems({...result(), answers: {}}));
    assert.throws(() => problems({...result(), stopReason: 'error'}));
  });
  await test('redaction before clipping; no file bodies, diff or sensitive output', () => {
    process.env.TEST_API_KEY = 'opaque-secret-marker-123456789';
    assert.ok(!redact('opaque-secret-marker-123456789').includes(process.env.TEST_API_KEY));
    assert.ok(!redact('Bearer abcdefgh password="hidden" sk-' + 'or-abcdefghijklmn').includes('hidden'));
    const calls = [
      {type:'toolCall',id:'r',name:'read',arguments:{path:'code.ts'}},
      {type:'toolCall',id:'d',name:'bash',arguments:{command:'git diff'}},
      {type:'toolCall',id:'s',name:'bash',arguments:{command:'read auth.json'}},
      {type:'toolCall',id:'t',name:'bash',arguments:{command:'npm test'}},
    ];
    const data = evidence([{role:'assistant',content:calls}, ...calls.map(c=>({role:'toolResult', toolCallId:c.id,toolName:c.name,content:[{type:'text',text:'opaque-secret-marker-123456789 code content'}],isError:false}))]);
    assert.ok(data.slice(0,3).every(d=>d.output.includes('omitted')));
    assert.ok(!JSON.stringify(data).includes(process.env.TEST_API_KEY));
    delete process.env.TEST_API_KEY;
  });
  await test('success once, duplicate boundary does not reclassify; preserves other drafts', async () => {
    const f=fixture(); await f.start();
    const other={type:'custom',customType:'other',data:{ok:true}};
    const r=await f.settle({entries:[other]});
    assert.equal(r.continue,undefined); assert.equal(r.entries[0],other);
    assert.equal(r.entries[1].data.status,'no-flags');
    assert.equal(await f.settle(),undefined); assert.equal(f.requests.length,1);
    const state=f.requests[0][1].state;
    assert.ok(state.rules.includes('answer honestly'));
    assert.ok(state.todo_before.includes('Test reply')); assert.ok(state.todo_now.includes('Test reply'));
    assert.equal(f.requests[0][2].maxRetries,0); assert.equal(f.requests[0][2].timeoutMs,8000);
  });
  await test('at most one correction across tool/agent loops, then reports remaining flags', async () => {
    const f=fixture(result(0.99)); await f.start();
    assert.equal((await f.settle({context:{contextMessages:[user('Reply exactly YES'),assistant('NO')],canContinue:false}})).continue,true);
    f.setMessages([user('Reply exactly YES'),assistant('Still NO')]);
    const second=await f.settle(); assert.equal(second.continue,undefined); assert.equal(second.entries.length,1);
    assert.equal(second.entries[0].data.correctionUsed,true);
    assert.ok(f.notices.some(n=>n[0].includes('автоповтор остановлен')));
    f.setMessages([user('Reply exactly YES'),assistant('NO again')]);
    assert.equal((await f.settle()).continue,undefined);
    await f.start(); assert.equal((await f.settle()).continue,true);
  });
  await test('unavailable, malformed response, thrown request and missing model never approve or continue', async () => {
    for(const outcome of [{...result(),stopReason:'error'},{...result(),answers:{}},()=>{throw new Error('secret error')}]) {
      const f=fixture(outcome); await f.start(); const r=await f.settle();
      assert.equal(r.continue,undefined); assert.equal(r.entries[0].data.status,'unavailable');
      assert.ok(!JSON.stringify(r).includes('secret error'));
    }
    const f=fixture(); f.ctx.modelRegistry.findOfType=()=>undefined;
    await f.start(); assert.equal((await f.settle()).entries[0].data.reason,'model absent'); assert.equal(f.requests.length,0);
  });
  await test('abort, pending work, prior continuation and failed runs are not reviewed', async () => {
    const f=fixture(); await f.start();
    assert.equal(await f.settle({outcome:'aborted'}),undefined);
    assert.equal(await f.settle({outcome:'error'}),undefined);
    assert.equal(await f.settle({continue:true}),undefined);
    f.ctx.hasPendingMessages=()=>true;
    assert.equal(await f.settle(),undefined); assert.equal(f.requests.length,0);
  });
  await test('combined payload budget preserves rules, handles JSON escaping and marks omissions', () => {
    const rules = 'Full mandatory rule.\n'.repeat(1800);
    const state = { rules, read_rules: [rules, 'Separate rule', 'Separate rule'],
      request: 'Request\\"\n'.repeat(900), answer: 'Answer\\"\n'.repeat(1800),
      request_context: ['context'.repeat(2000)], followups: ['followup'.repeat(2000)],
      todo_before: 'todo'.repeat(3000), todo_now: 'todo'.repeat(3000),
      evidence: Array.from({length:20}, () => ({tool:'bash',action:'test',failed:false,output:'log\\"\n'.repeat(250)})), scope: 'Bounded evidence.' };
    assert.ok(JSON.stringify(state).length > 64000);
    const fitted = fitState(state);
    assert.ok(fitted.chars <= 64000); assert.equal(fitted.chars, JSON.stringify(state).length);
    assert.equal(fitted.limited,true); assert.equal(state.rules,rules);
    assert.deepEqual(state.read_rules,['Separate rule']);
    assert.ok(JSON.stringify(state).includes('[OMITTED]'));
    const again = JSON.stringify(state); assert.equal(fitState(state).limited,false);
    assert.equal(JSON.stringify(state),again);
  });
  await test('oversized ordinary context is compacted before classifier submission', async () => {
    const f=fixture(); const rules='Mandatory rule.\n'.repeat(2500);
    f.ctx.getSystemPrompt=()=>rules; await f.start();
    f.setMessages([user('context'.repeat(1500)), user('more context'.repeat(1000)), assistant('answer'.repeat(2500))]);
    const r=await f.settle();
    assert.equal(f.requests.length,1); assert.equal(r.entries[0].data.status,'no-flags');
    assert.equal(r.entries[0].data.limited,true);
    const state=f.requests[0][1].state;
    assert.equal(state.rules,rules); assert.ok(JSON.stringify(state).length<=64000);
  });
  await test('oversized rules are not truncated or silently approved; untrusted TODO not read', async () => {
    const f=fixture(); f.ctx.getSystemPrompt=()=> 'x'.repeat(65000); await f.start();
    const r=await f.settle(); assert.equal(r.entries[0].data.reason,'payload too large; rules not truncated'); assert.equal(f.requests.length,0);
    const g=fixture(); g.ctx.isProjectTrusted=()=>false; await g.start(); await g.settle();
    assert.equal(g.requests[0][1].state.todo_now,'[not read: project not trusted]');
  });
  await test('nearest TODO from subdirectory; latest rule read included, ordinary source excluded', async () => {
    const f=fixture(); await mkdir(join(dir,'nested')); f.ctx.cwd=join(dir,'nested'); await f.start();
    const messages=[user('Reply exactly YES'),{role:'assistant',content:[{type:'toolCall',id:'rule',name:'read',arguments:{path:'AGENT_COMMUNICATION_RULES.md'}}]},
      {role:'toolResult',toolCallId:'rule',toolName:'read',content:[{type:'text',text:'Project rule: no new dependency.'}],isError:false},assistant('YES')];
    f.setMessages(messages); await f.settle();
    assert.ok(f.requests[0][1].state.todo_now.includes('Test reply'));
    assert.deepEqual(f.requests[0][1].state.read_rules,['Project rule: no new dependency.']);
  });
  await test('on/off is session-local and reconstructed from active branch', async () => {
    const f=fixture(); const command=f.commands.get('jev-review');
    await command.handler('off',f.ctx); await f.start(); assert.equal(await f.settle(),undefined);
    await f.handlers.get('session_start')({},f.ctx); await f.start(); assert.equal(await f.settle(),undefined);
    await command.handler('on',f.ctx); await f.start(); assert.ok(await f.settle());
  });
  await test('new prompt cancels pending classifier; stale check cannot continue', async () => {
    let resolveReview; const f=fixture(()=>new Promise(resolve=>{resolveReview=resolve})); await f.start();
    const pending=f.settle(); while(!resolveReview) await new Promise(resolve=>setTimeout(resolve,1));
    const signal=f.requests[0][2].signal;
    await f.start('New task'); assert.equal(signal.aborted,true);
    resolveReview(result(0.99)); assert.equal(await pending,undefined);
  });
  await test('manual check does not start correction and is available even when automatic review is off', async () => {
    const f=fixture(result(0.99)); const command=f.commands.get('jev-review');
    await command.handler('off',f.ctx); await command.handler('check',f.ctx);
    assert.equal(f.requests.length,1); assert.ok(f.entries.some(e=>e.customType==='jev-review' && e.data.status==='issues'));
    assert.ok(!f.entries.some(e=>e.customType==='jev-review-feedback'));
  });
  console.log(`Checks: ${passed} passed`);
} finally { await rm(dir,{recursive:true,force:true}); }
