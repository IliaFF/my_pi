import { constants } from "node:fs";
import { access, lstat, open, readFile, realpath, rename, stat, unlink, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, isAbsolute, join, parse, relative, sep } from "node:path";
import { randomUUID } from "node:crypto";

const LOCK_WAIT_MS = 50;
const LOCK_ATTEMPTS = 40;
const STALE_LOCK_MS = 30_000;
const ROOT_MARKERS = [".git", "AGENTS.md"];
const TODO_SKELETON = "# TODO\n\n## In progress\n\n## Pending\n\n## Blocked\n\n## Completed\n";

async function entryAt(path: string) {
  return lstat(path).catch((error: any) => {
    if (error.code !== "ENOENT") throw error;
    return undefined;
  });
}

async function projectRoot(directory: string): Promise<{ root: string; marked: boolean }> {
  for (let ancestor = directory; ; ancestor = dirname(ancestor)) {
    for (const marker of ROOT_MARKERS) {
      const entry = await entryAt(join(ancestor, marker));
      if (!entry) continue;
      if (marker === ".git" && !entry.isDirectory() && !entry.isFile()) {
        throw new Error(`Invalid Git project boundary: ${ancestor}`);
      }
      return { root: ancestor, marked: true };
    }
    if (dirname(ancestor) === ancestor) return { root: directory, marked: false };
  }
}

async function startDirectory(start: string): Promise<string> {
  const directory = await realpath(start);
  return (await lstat(directory)).isDirectory() ? directory : dirname(directory);
}

// Creating a queue in home, root or temp directories without a project marker would only leave junk behind.
function scratchDirectory(root: string, marked: boolean): boolean {
  if (marked) return false;
  const temporary = tmpdir();
  return root === homedir() || root === parse(root).root || root === temporary || root.startsWith(`${temporary}${sep}`);
}

export async function findTodoPath(start: string): Promise<string> {
  const startDir = await startDirectory(start);
  const { root: boundary } = await projectRoot(startDir);
  for (let directory = startDir; ; directory = dirname(directory)) {
    const candidate = join(directory, "TODO.md");
    const entry = await lstat(candidate).catch((error: any) => {
      if (error.code !== "ENOENT") throw error;
      return undefined;
    });
    if (entry) {
      const target = await realpath(candidate);
      const path = relative(boundary, target);
      if (path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path)) throw new Error(`TODO.md resolves outside project: ${candidate}`);
      if (!(await lstat(target)).isFile()) throw new Error(`TODO.md must be a regular file: ${candidate}`);
      await access(target, constants.R_OK | constants.W_OK);
      return target;
    }
    if (directory === boundary) break;
  }
  throw new Error(`TODO.md not found above ${start} within project boundary ${boundary}`);
}

/** Create the standard queue at the project root when nothing exists in the boundary. */
export async function ensureTodoPath(start: string): Promise<string> {
  const directory = await startDirectory(start);
  const { root, marked } = await projectRoot(directory);
  try {
    return await findTodoPath(start);
  } catch (error: any) {
    if (typeof error?.message !== "string" || !error.message.startsWith("TODO.md not found above ")) throw error;
  }
  if (scratchDirectory(root, marked)) {
    throw new Error(`TODO.md not found above ${start} within project boundary ${root}; queue is not created in ${root}`);
  }
  const target = join(root, "TODO.md");
  await writeFile(target, TODO_SKELETON, { flag: "wx", mode: 0o644 }).catch((error: any) => {
    if (error?.code !== "EEXIST") throw error;
  });
  return findTodoPath(start);
}

async function acquireLock(path: string) {
  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
    try {
      const handle = await open(path, "wx", 0o600);
      await handle.writeFile(`${process.pid} ${Date.now()}\n`, "utf8");
      return handle;
    } catch (error: any) {
      if (error?.code !== "EEXIST") throw error;
      try {
        const info = await stat(path);
        if (Date.now() - info.mtimeMs > STALE_LOCK_MS) {
          const pid = Number((await readFile(path, "utf8")).split(/\s+/)[0]);
          let alive = false;
          if (Number.isSafeInteger(pid) && pid > 0) {
            try { process.kill(pid, 0); alive = true; } catch (error: any) { if (error.code !== "ESRCH") alive = true; }
          }
          if (alive) throw new Error("TODO.md is locked by another Pi session");
          await unlink(path);
          continue;
        }
      } catch (staleError: any) {
        if (staleError?.code !== "ENOENT") throw staleError;
      }
      await new Promise((resolve) => setTimeout(resolve, LOCK_WAIT_MS));
    }
  }
  throw new Error("TODO.md is locked by another Pi session");
}

export async function mutateTodo<T>(todoPath: string, mutation: (text: string) => { text: string; value: T } | Promise<{ text: string; value: T }>): Promise<T> {
  const lockPath = `${todoPath}.pi-task.lock`;
  const lock = await acquireLock(lockPath);
  let temporary: string | undefined;
  try {
    const original = await readFile(todoPath, "utf8");
    const result = await mutation(original);
    if (result.text === original) return result.value;
    const current = await readFile(todoPath, "utf8");
    if (current !== original) throw new Error("TODO.md changed during update; retry explicitly");
    const info = await stat(todoPath);
    temporary = join(dirname(todoPath), `.TODO.md.pi-task-${process.pid}-${randomUUID()}.tmp`);
    const output = await open(temporary, "wx", info.mode & 0o777);
    try {
      await output.writeFile(result.text, "utf8");
      await output.sync();
    } finally {
      await output.close();
    }
    await rename(temporary, todoPath);
    temporary = undefined;
    return result.value;
  } finally {
    if (temporary) await unlink(temporary).catch(() => {});
    await lock.close().catch(() => {});
    await unlink(lockPath).catch(() => {});
  }
}
