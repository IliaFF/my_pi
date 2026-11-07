import assert from "node:assert/strict";
import test from "node:test";
import { chmod, copyFile, lstat, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { addTask, blockCurrent, claimNext, completeCurrent, deleteTask, editTask, inspectTodo, movePendingTask, releaseCurrent, formatQueuePanel } from "../local-extensions/todo-queue/core.ts";
import { ensureTodoPath, findTodoPath, mutateTodo } from "../local-extensions/todo-queue/store.ts";

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
  assert.deepEqual(lines.slice(2, 5), ["├─ ○ Next 1", "├─ ○ Next 2", "├─ ○ Next 3"]);
  assert.match(lines[5], /2/);
  assert.doesNotMatch(lines.join("\n"), /Old result|Not selected|Next 4|Next 5/);
  assert.equal(formatQueuePanel(state, true).length, 1);
  assert.equal(JSON.stringify(state), before);
});

test("panel tree honors viewport budgets, overflow and current/FIFO/blocked order", () => {
  let text = claimNext(base, "active").text;
  for (let i = 1; i <= 7; i++) text = addTask(text, `Next ${i}`, `n${i}`).text;
  text = text.replace("## Blocked\n", "## Blocked\n- [ ] Waiting A\n- [ ] Waiting B\n");
  const state = inspectTodo(text);
  const before = JSON.stringify(state);
  for (const budget of [1, 2, 3, 6, 12]) {
    const lines = formatQueuePanel(state, false, budget);
    assert.ok(lines.length <= budget);
    if (budget > 1 && budget < 11) {
      assert.match(lines.at(-1), new RegExp(`^└─ \\+ ${10 - (budget - 2)} ещё`));
    }
    assert.equal(formatQueuePanel(state, true, budget).length, 1);
  }
  const all = formatQueuePanel(state, false, 12);
  assert.match(all[1], /^├─ ◐ Existing task$/);
  assert.match(all[8], /^├─ ○ Next 7$/);
  assert.match(all[9], /^├─ ! Waiting A$/);
  assert.match(all[10], /^└─ ! Waiting B$/);
  assert.doesNotMatch(all.join("\n"), /Old result/);
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

test("reopen selects only Blocked, preserves identity/order and requires an empty current slot", async () => {
  const { reopenBlocked } = await import("../local-extensions/todo-queue/core.ts");
  let text = addTask(base, "Second", "second").text;
  text = blockCurrent(claimNext(text, "blocked").text, "blocked", "Old blocker").text;
  const before = inspectTodo(text);
  const changed = reopenBlocked(text, "blocked");
  assert.equal(changed.task.id, "blocked");
  assert.equal(changed.task.text, before.blocked[0].text);
  assert.equal(inspectTodo(changed.text).current.id, "blocked");
  assert.deepEqual(inspectTodo(changed.text).pending, before.pending);
  assert.deepEqual(inspectTodo(changed.text).completed, before.completed);
  for (const id of ["missing", "second", ""]) assert.throws(() => reopenBlocked(text, id), /Blocked task/);
  assert.throws(() => reopenBlocked(claimNext(text, undefined, "second").text, "blocked"), /already in progress/);
  const crlf = reopenBlocked(text.replace(/\n/g, "\r\n"), "blocked").text;
  assert.equal(/(^|[^\r])\n/.test(crlf), false);
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

test("store finds parent TODO in the same worktree and writes mutation atomically", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "todo-queue-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q", root]);
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

async function discoveryFixture(t) {
  const root = await mkdtemp(join(tmpdir(), "todo-boundary-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const outside = join(root, "TODO.md");
  await writeFile(outside, base);
  const repo = join(root, "repo");
  await mkdir(repo);
  return { root, outside, repo };
}

test("store refuses parent queues for Git and non-Git projects", async (t) => {
  const { repo, outside } = await discoveryFixture(t);
  await assert.rejects(findTodoPath(repo), /TODO.md not found above/);
  await writeFile(join(repo, "TODO.md"), base);
  assert.equal(await findTodoPath(repo), join(repo, "TODO.md"));
  await rm(join(repo, "TODO.md"));
  execFileSync("git", ["init", "-q", repo]);
  await assert.rejects(findTodoPath(repo), /TODO.md not found above/);
  assert.equal(await readFile(outside, "utf8"), base);
  await writeFile(join(repo, "TODO.md"), base);
  assert.equal(await findTodoPath(repo), join(repo, "TODO.md"));
});

test("store stops at nested repository and linked worktree boundaries", async (t) => {
  const { root, repo } = await discoveryFixture(t);
  execFileSync("git", ["init", "-q", root]);
  execFileSync("git", ["init", "-q", repo]);
  await assert.rejects(findTodoPath(repo), /TODO.md not found above/);
  execFileSync("git", ["-C", repo, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-q", "--allow-empty", "-m", "Fixture"]);
  const linked = join(root, "linked");
  execFileSync("git", ["-C", repo, "worktree", "add", "-q", "--detach", linked, "HEAD"]);
  assert.match(await readFile(join(linked, ".git"), "utf8"), /^gitdir:/);
  await assert.rejects(findTodoPath(linked), /TODO.md not found above/);
  const nested = join(linked, "subdir");
  await mkdir(nested);
  await writeFile(join(linked, "TODO.md"), base);
  assert.equal(await findTodoPath(nested), join(linked, "TODO.md"));
});

test("store canonicalizes aliases and refuses external TODO links", async (t) => {
  const { root, repo, outside } = await discoveryFixture(t);
  execFileSync("git", ["init", "-q", repo]);
  const todo = join(repo, "TODO.md");
  await symlink(outside, todo);
  await assert.rejects(findTodoPath(repo), /outside project/);
  await rm(todo);
  await writeFile(todo, base);
  const alias = join(root, "alias");
  await symlink(repo, alias);
  assert.equal(await findTodoPath(alias), todo);
  assert.equal(await readFile(outside, "utf8"), base);
});

test("store does not substitute another queue on unusable TODO or access failure", async (t) => {
  const { root, repo, outside } = await discoveryFixture(t);
  execFileSync("git", ["init", "-q", repo]);
  const todo = join(repo, "TODO.md");
  await mkdir(todo);
  await assert.rejects(findTodoPath(repo), /regular file/);
  await rm(todo, { recursive: true });
  await writeFile(todo, base, { mode: 0o000 });
  // Root bypasses mode bits; exercise the real access error as an unprivileged child.
  await chmod(root, 0o755);
  const store = join(root, "store.ts");
  await copyFile(new URL("../local-extensions/todo-queue/store.ts", import.meta.url), store);
  const code = `import assert from 'node:assert/strict'; import { findTodoPath } from ${JSON.stringify(pathToFileURL(store).href)}; await assert.rejects(findTodoPath(${JSON.stringify(repo)}), { code: 'EACCES' });`;
  // /proc avoids a root-private nvm parent directory after dropping privileges.
  const executable = process.platform === "linux" ? "/proc/self/exe" : process.execPath;
  const child = spawnSync(executable, ["--input-type=module", "-e", code], {
    encoding: "utf8", timeout: 10000,
    ...(process.getuid?.() === 0 ? { uid: 65534, gid: 65534 } : {}),
  });
  assert.equal(child.status, 0, child.error?.message ?? child.stderr);
  assert.equal(await readFile(outside, "utf8"), base);
});

const aliased = `# Задачи

## В работе

## Ожидает
- Скачать тренировочный CSV
- [ ] Проверить отчёт

## Завершено
- Плоский исторический пункт
- [x] Закрыто

## Blocked
`;

test("section aliases and plain active bullets are recognized", () => {
  const state = inspectTodo(aliased);
  assert.deepEqual(state.pending.map((task) => task.text), ["Скачать тренировочный CSV", "Проверить отчёт"]);
  assert.equal(state.blocked.length, 0);
  assert.deepEqual(state.completed.map((task) => task.text), ["Закрыто"]);
  const claimed = claimNext(aliased, "alias1");
  assert.equal(claimed.task?.text, "Скачать тренировочный CSV");
  assert.match(claimed.text, /## В работе\n- \[ \] Скачать тренировочный CSV <!-- pi-task:alias1 -->/);
  assert.equal(inspectTodo(claimed.text).pending.length, 1);
  const done = completeCurrent(claimNext(aliased, "alias2").text, "alias2");
  assert.deepEqual(inspectTodo(done.text).completed.map((task) => task.text).slice(-1), ["Скачать тренировочный CSV"]);
  assert.match(done.text, /## Завершено\n/);
});

test("one logical section may use several spellings and plain history stays out", () => {
  const merged = `# TODO

## Ожидает
- Русский пункт

## Pending
- [ ] Latin task

## In progress

## Blocked

## Completed
- [x] Done
`;
  assert.deepEqual(inspectTodo(merged).pending.map((task) => task.text), ["Русский пункт", "Latin task"]);
  const added = addTask(merged, "New task", "new1").text;
  const lines = added.split("\n");
  const pendingHeader = lines.indexOf("## Pending");
  const latinIndex = lines.findIndex((line) => line.includes("Latin task"));
  const newIndex = lines.findIndex((line) => line.includes("New task"));
  assert.ok(pendingHeader < latinIndex && latinIndex < newIndex, added);
  assert.equal(inspectTodo(added).pending.at(-1)?.id, "new1");
  assert.throws(() => inspectTodo(`${merged}\n## Pending\n`), /Duplicate TODO section/);
  const historyOnly = `# TODO\n\n## In progress\n\n## Pending\n\n## Blocked\n\n## Completed\n- Итог без чекбокса\n`;
  assert.equal(inspectTodo(historyOnly).completed.length, 0);
  const latinFirst = `# TODO\n\n## Pending\n- [ ] Latin task\n\n## Ожидает\n- Русский пункт\n\n## In progress\n\n## Blocked\n\n## Completed\n`;
  const anchored = addTask(latinFirst, "New task", "new2").text;
  const anchoredLines = anchored.split("\n");
  const insertedIndex = anchoredLines.findIndex((line) => line.includes("New task"));
  assert.ok(insertedIndex > anchoredLines.indexOf("## Pending") && insertedIndex < anchoredLines.indexOf("## Ожидает"), anchored);
  assert.deepEqual(inspectTodo(anchored).pending.map((task) => task.id ?? task.text), ["Latin task", "new2", "Русский пункт"]);
  const notes = "# TODO\n\n## Notes\n- a\n\n## Notes\n- b\n\n## In progress\n\n## Pending\n\n## Blocked\n\n## Completed\n";
  assert.equal(inspectTodo(notes).pending.length, 0);
});

async function markedFixture(t) {
  const root = await mkdtemp(join(tmpdir(), "todo-marked-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "AGENTS.md"), "# Rules\n");
  const nested = join(root, "work", "inner");
  await mkdir(nested, { recursive: true });
  return { root, nested };
}

const skeleton = "# TODO\n\n## In progress\n\n## Pending\n\n## Blocked\n\n## Completed\n";

test("marked non-Git project root serves nested directories", async (t) => {
  const { root, nested } = await markedFixture(t);
  await assert.rejects(findTodoPath(nested), /TODO.md not found above/);
  await writeFile(join(root, "TODO.md"), base);
  assert.equal(await findTodoPath(nested), join(root, "TODO.md"));
});

test("missing TODO is created at the project root, not in the nested directory", async (t) => {
  const { root, nested } = await markedFixture(t);
  assert.equal(await ensureTodoPath(nested), join(root, "TODO.md"));
  assert.equal(await readFile(join(root, "TODO.md"), "utf8"), skeleton);
  assert.equal(await exists(join(nested, "TODO.md")), false);
  assert.equal(inspectTodo(await readFile(join(root, "TODO.md"), "utf8")).pending.length, 0);
  await writeFile(join(root, "TODO.md"), base);
  assert.equal(await ensureTodoPath(nested), join(root, "TODO.md"));
  assert.equal(await readFile(join(root, "TODO.md"), "utf8"), base);
  const unreadable = join(root, "unusable");
  await mkdir(unreadable);
  await mkdir(join(unreadable, "TODO.md"));
  await assert.rejects(ensureTodoPath(unreadable), /regular file/);
});

async function exists(path) {
  return lstat(path).then(() => true, (error) => error.code !== "ENOENT");
}

test("queue is never created in protected locations", async (t) => {
  await assert.rejects(ensureTodoPath(tmpdir()), /TODO.md not found above/);
  const home = join(await mkdtemp(join(tmpdir(), "todo-home-")), "home");
  t.after(() => rm(dirname(home), { recursive: true, force: true }));
  await mkdir(home);
  const store = join(dirname(home), "store.ts");
  await copyFile(new URL("../local-extensions/todo-queue/store.ts", import.meta.url), store);
  const code = `import assert from 'node:assert/strict'; import { ensureTodoPath } from ${JSON.stringify(pathToFileURL(store).href)}; await assert.rejects(ensureTodoPath(process.env.HOME), /TODO.md not found above/);`;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    encoding: "utf8", timeout: 20000, env: { ...process.env, HOME: home },
  });
  assert.equal(child.status, 0, child.error?.message ?? child.stderr);
  assert.equal(await exists(join(home, "TODO.md")), false);
});
