import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, mkdir, rm, chmod, symlink, utimes, truncate } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { mutateTodo } from '../local-extensions/todo-queue/store.ts';
import { fingerprint, assertFreshChecks } from '../local-extensions/todo-queue/checks.ts';

test('fingerprints include content, additions, deletions, modes, and untracked files but not queue bookkeeping', async () => {
  const root = await mkdtemp(join(tmpdir(), 'queue-files-'));
  try {
    execFileSync('git', ['init', '-q', root]);
    const todo = join(root, 'TODO.md'), src = join(root, 'source.txt');
    await writeFile(todo, 'queue'); await writeFile(src, 'one');
    execFileSync('git', ['-C', root, 'add', 'source.txt', 'TODO.md']);
    const snap = () => fingerprint(root, todo);
    const initial = await snap();
    await writeFile(todo, 'new queue'); await writeFile(todo + '.pi-task.lock', 'lock');
    assert.deepEqual(await snap(), initial);
    await writeFile(src, 'two'); assert.notDeepEqual(await snap(), initial);
    await writeFile(src, 'one'); assert.deepEqual(await snap(), initial);
    await chmod(src, 0o755); assert.notDeepEqual(await snap(), initial); await chmod(src, 0o644);
    await writeFile(join(root, 'new.txt'), 'new'); assert.notDeepEqual(await snap(), initial);
    await rm(join(root, 'new.txt')); assert.deepEqual(await snap(), initial);
    await rm(src); assert.notDeepEqual(await snap(), initial);
    await writeFile(join(root, 'link'), 'placeholder'); await rm(join(root, 'link'));
    await symlink(todo, join(root, 'link')); await assert.rejects(snap, /symlink|symbolic/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('non-Git scope works, unavailable scope fails, dependency caches are outside scope', async () => {
  const root = await mkdtemp(join(tmpdir(), 'queue-nogit-'));
  try {
    const todo = join(root, 'TODO.md'); await writeFile(todo, 'queue');
    await writeFile(join(root, 'source'), 'a'); const before = await fingerprint(root, todo);
    await mkdir(join(root, 'node_modules')); await writeFile(join(root, 'node_modules', 'cache'), 'x');
    await mkdir(join(root, '.pi', 'tasks'), { recursive: true }); await writeFile(join(root, '.pi', 'tasks', 'job.output'), 'PASS');
    assert.deepEqual(await fingerprint(root, todo), before);
    await assert.rejects(() => fingerprint(join(root, 'missing'), todo));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('only actual successful terminal checks of the current task and snapshot count', () => {
  const task = { id: 'task', text: 'Implement' };
  const pass = { id: 'check', taskId: 'task', taskText: 'Implement', command: 'test', cwd: '/project', jobId: 'job', status: 'completed', exitCode: 0, before: 'hash', after: 'hash' };
  assert.doesNotThrow(() => assertFreshChecks([], task, new Map())); // direct evidence unchanged
  assert.doesNotThrow(() => assertFreshChecks([pass], task, new Map([['/project', 'hash']])));
  for (const change of [{ status: 'running' }, { status: 'failed', exitCode: 1 }, { exitCode: undefined }, { before: 'old' }, { after: undefined }, { taskText: 'Old objective' }, { invalidated: true }]) {
    assert.throws(() => assertFreshChecks([{ ...pass, ...change }], task, new Map([['/project', 'hash']])));
  }
  assert.throws(() => assertFreshChecks([pass], task, new Map([['/project', 'changed']])));
  assert.throws(() => assertFreshChecks([pass], task, new Map()));
  const failed = { ...pass, id: 'failed', status: 'failed', exitCode: 1 };
  assert.doesNotThrow(() => assertFreshChecks([failed, pass], task, new Map([['/project', 'hash']])));
  assert.throws(() => assertFreshChecks([{ ...pass, status: 'running' }, pass], task, new Map([['/project', 'hash']])));
  assert.doesNotThrow(() => assertFreshChecks([{ ...pass, taskId: 'other' }], task, new Map()));
});

test('async TODO mutation preserves lock, concurrent edit detection and cleanup', async () => {
  const root = await mkdtemp(join(tmpdir(), 'queue-lock-')), todo = join(root, 'TODO.md');
  try {
    await writeFile(todo, 'initial');
    await assert.rejects(() => mutateTodo(todo, async text => { await writeFile(todo, 'external'); return { text: text + ' changed', value: 1 }; }), /changed during update/);
    await writeFile(todo + '.pi-task.lock', `${process.pid} old`);
    const old = new Date(Date.now() - 60000); await utimes(todo + '.pi-task.lock', old, old);
    await assert.rejects(() => mutateTodo(todo, text => ({ text: text + ' changed', value: 1 })), /locked/);
    await rm(todo + '.pi-task.lock');
    await mutateTodo(todo, async text => ({ text: text + ' changed', value: 1 }));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('snapshot refuses symlink ancestors and oversized inputs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'queue-links-'));
  const external = await mkdtemp(join(tmpdir(), 'queue-external-'));
  try {
    execFileSync('git', ['init', '-q', root]);
    const todo = join(root, 'TODO.md'); await writeFile(todo, 'queue');
    await mkdir(join(root, 'dir')); await writeFile(join(root, 'dir', 'source'), 'same');
    execFileSync('git', ['-C', root, 'add', 'dir/source']);
    await writeFile(join(root, '.gitignore'), '/dir');
    await rm(join(root, 'dir'), { recursive: true });
    await writeFile(join(external, 'source'), 'same'); await symlink(external, join(root, 'dir'));
    await assert.rejects(() => fingerprint(root, todo), /symlink|symbolic/i);
    await rm(join(root, 'dir')); await mkdir(join(root, 'dir')); await writeFile(join(root, 'dir', 'source'), '');
    // Cross the aggregate budget without exceeding the VPS sandbox's 64 MiB file limit.
    for (let i = 0; i < 5; i++) {
      const path = join(root, `part-${i}`); await writeFile(path, ''); await truncate(path, 64 * 1024 * 1024);
    }
    await assert.rejects(() => fingerprint(root, todo), /byte limit/);
  } finally { await rm(root, { recursive: true, force: true }); await rm(external, { recursive: true, force: true }); }
});
