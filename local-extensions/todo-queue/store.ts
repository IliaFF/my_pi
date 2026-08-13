import { constants } from "node:fs";
import { access, lstat, open, readFile, rename, stat, unlink } from "node:fs/promises";
import { dirname, join, parse } from "node:path";
import { randomUUID } from "node:crypto";

const LOCK_WAIT_MS = 50;
const LOCK_ATTEMPTS = 40;
const STALE_LOCK_MS = 30_000;

export async function findTodoPath(start: string): Promise<string> {
  let directory = start;
  try {
    if (!(await lstat(directory)).isDirectory()) directory = dirname(directory);
  } catch {}
  for (;;) {
    const candidate = join(directory, "TODO.md");
    try {
      await access(candidate, constants.R_OK | constants.W_OK);
      return candidate;
    } catch {}
    const parent = dirname(directory);
    if (parent === directory || parse(directory).root === directory) break;
    directory = parent;
  }
  throw new Error(`TODO.md not found above ${start}`);
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

export async function mutateTodo<T>(todoPath: string, mutation: (text: string) => { text: string; value: T }): Promise<T> {
  const lockPath = `${todoPath}.pi-task.lock`;
  const lock = await acquireLock(lockPath);
  let temporary: string | undefined;
  try {
    const original = await readFile(todoPath, "utf8");
    const result = mutation(original);
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
