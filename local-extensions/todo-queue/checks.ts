import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { lstat, readdir, realpath } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { basename, dirname, join, resolve, relative, sep } from "node:path";
import type { ExtensionAPI, ExtensionContext, ExtensionToolContext } from "@earendil-works/pi-coding-agent";
import type { QueueTask } from "./core.ts";

const exec = promisify(execFile);
const ENTRY = "todo-queue-check-v1";
const SKIP = new Set([".git", "node_modules", ".venv", "__pycache__", ".cache", "coverage", "test-results"]);

export type CheckRecord = {
  id: string; taskId: string; taskText: string; command: string; cwd: string;
  status: string; jobId?: string; before?: string; after?: string; exitCode?: number;
  invalidated?: boolean; error?: string;
};

export async function fingerprint(cwd: string, todo: string): Promise<string> {
  const deadline = Date.now() + 10_000;
  let root = await realpath(cwd), git = false;
  try {
    const r = await exec("git", ["-C", root, "rev-parse", "--show-toplevel"], { timeout: 5000, maxBuffer: 8192 });
    root = await realpath(r.stdout.trim()); git = true;
  } catch (error: any) {
    // A missing Git executable or a broken repository must not quietly change proof scope.
    if (!String(error.stderr).includes("not a git repository")) throw error;
  }
  const excluded = (path: string) => /(^|\/)\.pi\/tasks(\/|$)/.test(relative(root, path).split(sep).join("/")) || path === resolve(todo) ||
    (dirname(path) === dirname(resolve(todo)) && (basename(path) === `${basename(todo)}.pi-task.lock` || /^\.TODO\.md\.pi-task-.*\.tmp$/.test(basename(path))));
  const files = async () => {
    if (git) {
      const r = await exec("git", ["-C", root, "ls-files", "-z", "--cached", "--others", "--exclude-standard"], { timeout: 5000, maxBuffer: 8 * 1024 * 1024 });
      return [...new Set(r.stdout.split("\0").filter(Boolean))].filter(p => !excluded(join(root, p))).sort();
    }
    const paths: string[] = [];
    const walk = async (dir: string, prefix = "", depth = 0) => {
      if (depth > 100 || Date.now() > deadline) throw new Error("Snapshot traversal limit exceeded");
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name), rel = join(prefix, entry.name);
        if (excluded(path) || SKIP.has(entry.name)) continue;
        if (entry.isDirectory()) await walk(path, rel, depth + 1);
        else paths.push(rel);
        if (paths.length > 50_000) throw new Error("Snapshot file limit exceeded");
      }
    };
    await walk(root); return paths.sort();
  };
  const paths = await files();
  if (paths.length > 50_000) throw new Error("Snapshot file limit exceeded");
  const hash = createHash("sha256").update(JSON.stringify(["v1", root, git]));
  let bytes = 0;
  for (const path of paths) {
    if (Date.now() > deadline) throw new Error("Snapshot deadline exceeded");
    const full = join(root, path);
    const stat = await lstat(full).catch((e: any) => { if (e.code === "ENOENT") return undefined; throw e; });
    hash.update(JSON.stringify([path, stat ? stat.mode & 0o111 : "deleted"]));
    if (!stat) continue;
    if (!stat.isFile() || await realpath(full) !== full) throw new Error(`Snapshot refuses symlink/submodule/unsupported file: ${path}`);
    if (bytes + stat.size > 256 * 1024 * 1024) throw new Error("Snapshot byte limit exceeded");
    const content = createHash("sha256");
    for await (const chunk of createReadStream(full, { signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) })) {
      bytes += chunk.length;
      if (bytes > 256 * 1024 * 1024) throw new Error("Snapshot byte limit exceeded");
      content.update(chunk);
    }
    hash.update(content.digest());
    const after = await lstat(full);
    if (stat.ino !== after.ino || stat.size !== after.size || stat.mtimeMs !== after.mtimeMs || stat.ctimeMs !== after.ctimeMs) throw new Error(`Files changed during snapshot: ${path}`);
  }
  if (JSON.stringify(paths) !== JSON.stringify(await files()) || Date.now() > deadline) throw new Error("Files changed or snapshot deadline exceeded");
  return hash.digest("hex");
}

export function assertFreshChecks(records: CheckRecord[], task: Pick<QueueTask, "id" | "text">, snapshots: Map<string, string>): void {
  const own = records.filter(r => r.taskId === task.id);
  if (own.some(r => r.status === "running")) throw new Error("Required check is still running; wait for its notification");
  const latest = new Map(own.map(r => [JSON.stringify([r.cwd, r.command]), r]));
  for (const record of latest.values()) {
    if (record.invalidated || record.taskText !== task.text || record.status !== "completed" || record.exitCode !== 0 || !record.jobId || !record.before || record.before !== record.after || record.after !== snapshots.get(record.cwd)) {
      throw new Error(`Check ${record.id} is failed, stale or unknown; explicitly rerun: ${record.command}`);
    }
  }
}

export function queueChecks(pi: ExtensionAPI) {
  const records = (ctx: ExtensionContext): CheckRecord[] => {
    const entries = new Map<string, CheckRecord>();
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "custom" && entry.customType === ENTRY) {
        const r = entry.data as CheckRecord;
        if (!r || typeof r.id !== "string" || typeof r.taskId !== "string" || typeof r.cwd !== "string" || typeof r.command !== "string") throw new Error("Invalid queue check history");
        entries.set(r.id, { ...r });
      }
    }
    return [...entries.values()];
  };
  const save = (record: CheckRecord) => pi.appendEntry(ENTRY, { ...record });
  const shell = (r: CheckRecord) => `cd -- '${r.cwd.replace(/'/g, "'\\''")}' && (\n${r.command}\n)`;
  return {
    invalidate(ctx: ExtensionContext, id: string) {
      for (const record of records(ctx).filter(r => r.taskId === id)) save({ ...record, invalidated: true });
    },
    async start(ctx: ExtensionToolContext, todo: string, task: QueueTask, command: string, cwd: string, timeout: number) {
      if (records(ctx).length >= 100) throw new Error("Session check limit reached (100); retain history and use a new session");
      const record: CheckRecord = { id: randomUUID(), taskId: task.id!, taskText: task.text, command, cwd: resolve(cwd), status: "unknown" };
      save(record);
      try {
        record.before = await fingerprint(record.cwd, todo);
        const response = await ctx.executeTool("bg_run", { name: "Queue validation check", command: shell(record), isAgent: false, timeoutSeconds: timeout, notifyOnCompletion: true, triggerOnCompletion: false, surviveReload: false });
        const job = (response.result.details as any)?.task;
        if (response.isError || !job || typeof job.id !== "string" || job.command !== shell(record)) throw new Error("Background launch returned no valid job identity");
        record.jobId = job.id; record.status = "running";
      } catch (error) {
        record.error = error instanceof Error ? error.message : String(error);
        save({ ...record }); throw error;
      }
      save({ ...record }); return record;
    },
    async inspect(ctx: ExtensionToolContext, todo: string, task: QueueTask): Promise<CheckRecord[]> {
      const own = records(ctx).filter(r => r.taskId === task.id);
      for (const record of own.filter(r => r.status === "running")) {
        try {
          const response = await ctx.executeTool("bg_status", { taskId: record.jobId });
          const job = (response.result.details as any)?.tasks?.[0];
          if (response.isError || !job || job.id !== record.jobId || job.command !== shell(record)) throw new Error("Background job unavailable or identity changed");
          if (job.status === "running") continue;
          record.status = job.status === "completed" && job.exitCode === 0 && !job.error && !job.signal ? "completed" : "failed";
          record.exitCode = job.exitCode;
          record.after = await fingerprint(record.cwd, todo);
        } catch (error) { record.status = "unknown"; record.error = error instanceof Error ? error.message : String(error); }
        save({ ...record });
      }
      return own;
    },
    async validate(ctx: ExtensionToolContext, todo: string, task: QueueTask) {
      const own = await this.inspect(ctx, todo, task);
      const snapshots = new Map<string, string>();
      for (const cwd of new Set(own.map(r => r.cwd))) snapshots.set(cwd, await fingerprint(cwd, todo));
      assertFreshChecks(own, task, snapshots);
      return own;
    },
  };
}
