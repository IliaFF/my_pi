import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTask, blockCurrent, claimNext, completeCurrent, deleteTask, editTask, inspectTodo, movePendingTask, releaseCurrent, formatQueuePanel } from "../local-extensions/todo-queue/core.ts";
import { findTodoPath, mutateTodo } from "../local-extensions/todo-queue/store.ts";

const base = `# TODO

## In progress

## Pending

- [ ] Existing task

## Blocked

## Completed
- [x] Old result
`;

test("panel is compact, FIFO, read-only and omits completed/deferred tasks", () => {
  let text = claimNext(base, "active").text;
  for (let i = 1; i <= 5; i++) text = addTask(text, `Next ${i}`, `n${i}`).text;
  text += "\n## Deferred ideas\n- [ ] Not selected\n";
  const state = inspectTodo(text);
  const before = JSON.stringify(state);
  const lines = formatQueuePanel(state, false);
  assert.equal(lines.length, 6);
  assert.match(lines[0], /Pending: 5.*Blocked: 0/);
  assert.match(lines[1], /Existing task/);
  assert.deepEqual(lines.slice(2, 5), ["○ Next 1", "○ Next 2", "○ Next 3"]);
  assert.match(lines[5], /2/);
  assert.doesNotMatch(lines.join("\n"), /Old result|Not selected|Next 4|Next 5/);
  assert.equal(formatQueuePanel(state, true).length, 1);
  assert.equal(JSON.stringify(state), before);
});

test("panel hides completed-only queues and shows blocked count", () => {
  assert.deepEqual(formatQueuePanel(inspectTodo("## Completed\n- [x] Finished\n"), false), []);
  const text = blockCurrent(claimNext(base, "a").text, "a", "waiting").text;
  assert.match(formatQueuePanel(inspectTodo(text), false)[0], /Pending: 0.*Blocked: 1/);
});

test("panel neutralizes terminal controls without breaking Unicode", () => {
  const state = inspectTodo(base);
  state.pending[0].text = "\x1b[31m红色\x1b[0m\n\x1b]8;;https://evil\x07link\x1b]8;;\x07\u202E e\u0301 👩‍💻";
  const line = formatQueuePanel(state, false)[1];
  assert.doesNotMatch(line, /[\x00-\x1f\x7f-\x9f\u202e]/);
  assert.match(line, /红色.*link.*e\u0301.*👩‍💻/);
});

test("add appends a stable hidden id and preserves unrelated content", () => {
  const changed = addTask(base, "New small task", "abc123");
  assert.match(changed.text, /- \[ \] New small task <!-- pi-task:abc123 -->/);
  assert.match(changed.text, /# TODO/);
  assert.equal(inspectTodo(changed.text).pending.length, 2);
});

test("task text is flattened and unsafe comments are rejected", () => {
  assert.match(addTask(base, "line one\nline two", "flat1").task.text, /line one line two/);
  assert.throws(() => addTask(base, "bad <!-- pi-task:x -->"), /HTML comments/);
});

test("claim moves first pending task and assigns id", () => {
  const changed = claimNext(base, "claim1");
  assert.equal(changed.task?.text, "Existing task");
  assert.equal(changed.task?.id, "claim1");
  const state = inspectTodo(changed.text);
  assert.equal(state.current?.id, "claim1");
  assert.equal(state.pending.length, 0);
});

test("claim selects an explicit pending id without reorder and rejects absent ids", () => {
  const seeded = addTask(base, "Second", "second").text;
  const changed = claimNext(seeded, undefined, "second");
  assert.equal(changed.task.id, "second");
  assert.deepEqual(inspectTodo(changed.text).pending.map(task => task.text), ["Existing task"]);
  for (const id of ["missing", ""]) assert.throws(() => claimNext(seeded, undefined, id), /Pending task id not found/);
});

test("claim refuses a second in-progress task", () => {
  const first = claimNext(base, "claim1").text;
  assert.throws(() => claimNext(first, "claim2"), /already in progress/);
});

test("complete requires matching current id and moves task", () => {
  const first = claimNext(base, "claim1").text;
  assert.throws(() => completeCurrent(first, "wrong"), /does not match/);
  const done = completeCurrent(first, "claim1");
  const state = inspectTodo(done.text);
  assert.equal(state.current, undefined);
  const completed = state.completed.find((task) => task.id === "claim1");
  assert.equal(completed?.id, "claim1");
  assert.equal(completed?.checked, true);
});

test("block records reason and clears current", () => {
  const first = claimNext(base, "claim1").text;
  const blocked = blockCurrent(first, "claim1", "Need API access");
  const state = inspectTodo(blocked.text);
  assert.equal(state.current, undefined);
  assert.match(state.blocked[0].text, /Заблокировано: Need API access/);
});

test("release returns current task to front of Pending", () => {
  const seeded = addTask(base, "Second", "second").text;
  const first = claimNext(seeded, "first").text;
  const released = releaseCurrent(first, "first");
  assert.equal(inspectTodo(released.text).pending[0].id, "first");
});

test("CRLF and final newline are preserved", () => {
  const input = base.replace(/\n/g, "\r\n");
  const output = addTask(input, "Windows", "win1").text;
  assert.equal(output.includes("\r\n"), true);
  assert.equal(/(^|[^\r])\n/.test(output), false);
  assert.equal(output.endsWith("\r\n"), true);
});

test("missing sections are accepted and restored on mutation", () => {
  const missing = base.replace("## Blocked\n\n", "");
  assert.equal(inspectTodo(missing).blocked.length, 0);
  const healed = addTask(missing, "Heals layout", "heal1").text;
  assert.match(healed, /^## Blocked$/m);
  assert.equal(inspectTodo(healed).pending.some((task) => task.id === "heal1"), true);
});

test("managed sections may appear in any order", () => {
  const reordered = `# TODO\n\n## Completed\n- [x] Old result\n\n## Blocked\n\n## Pending\n- [ ] Existing task\n\n## In progress\n`;
  assert.equal(inspectTodo(reordered).pending[0]?.text, "Existing task");
  const changed = claimNext(reordered, "claim1");
  assert.equal(inspectTodo(changed.text).current?.id, "claim1");
});

test("duplicate managed sections and ids fail closed", () => {
  assert.throws(() => inspectTodo(`${base}\n## Blocked\n`), /Duplicate TODO section/);
  const duplicate = base.replace("- [ ] Existing task", "- [ ] A <!-- pi-task:dup -->\n- [ ] B <!-- pi-task:dup -->");
  assert.throws(() => inspectTodo(duplicate), /Duplicate pi-task id/);
});

test("edit updates a managed Pending or Blocked task", () => {
  const seeded = addTask(base, "Editable", "edit1").text;
  const edited = editTask(seeded, "edit1", "Edited title");
  assert.equal(inspectTodo(edited.text).pending.find((task) => task.id === "edit1")?.text, "Edited title");
});

test("delete removes managed Pending task and protects active task", () => {
  const seeded = addTask(base, "Disposable", "delete1").text;
  const deleted = deleteTask(seeded, "delete1");
  assert.equal(inspectTodo(deleted.text).pending.some((task) => task.id === "delete1"), false);
  const active = claimNext(base, "active1").text;
  assert.throws(() => deleteTask(active, "active1"), /In progress cannot be edited or deleted/);
});

test("move reorders Pending tasks in all four directions", () => {
  let text = addTask(base, "A", "a1").text;
  text = addTask(text, "B", "b1").text;
  text = movePendingTask(text, "b1", "top").text;
  assert.equal(inspectTodo(text).pending[0].id, "b1");
  text = movePendingTask(text, "b1", "bottom").text;
  assert.equal(inspectTodo(text).pending.at(-1)?.id, "b1");
  text = movePendingTask(text, "b1", "up").text;
  assert.equal(inspectTodo(text).pending.at(-2)?.id, "b1");
  text = movePendingTask(text, "b1", "down").text;
  assert.equal(inspectTodo(text).pending.at(-1)?.id, "b1");
});

test("store finds parent TODO and writes mutation atomically", async () => {
  const root = await mkdtemp(join(tmpdir(), "todo-queue-test-"));
  const nested = join(root, "a", "b");
  await mkdir(nested, { recursive: true });
  const todo = join(root, "TODO.md");
  await writeFile(todo, base, "utf8");
  assert.equal(await findTodoPath(nested), todo);
  const task = await mutateTodo(todo, (content) => {
    const changed = addTask(content, "Stored task", "stored1");
    return { text: changed.text, value: changed.task };
  });
  assert.equal(task.id, "stored1");
  assert.equal(inspectTodo(await readFile(todo, "utf8")).pending.at(-1)?.id, "stored1");
});
