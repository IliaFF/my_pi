import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { ImageContent } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { findTodoPath } from "./todo-queue/store.ts";
import { inspectTodo } from "./todo-queue/core.ts";

export default function taskSession(pi: ExtensionAPI): void {
  let pending: { token: string; sessionId: string; task: string; reason: string; images: ImageContent[]; queueRun?: { autoRun: true; completedThisRun: number; handoff: true }; started: boolean } | undefined;

  const safe = async (ctx: ExtensionContext) => {
    if (!ctx.isProjectTrusted()) {
      throw new Error("Project is not trusted; task session handoff refused");
    }
    if (ctx.hasPendingMessages()) throw new Error("Messages are pending; clarify before changing sessions");
    if (!ctx.sessionManager.getSessionFile()) throw new Error("Task handoff requires a persisted session so the old history remains recoverable");
    let path: string;
    try { path = await findTodoPath(ctx.cwd); }
    catch (error) {
      if (error instanceof Error && error.message.startsWith("TODO.md not found above ")) return;
      throw error;
    }
    if (inspectTodo(await readFile(path, "utf8")).current) {
      throw new Error("A TODO task is still In progress; ask the user before pausing it or changing sessions");
    }
  };

  pi.registerCommand("task-session-handoff", {
    description: "Internal native handoff for start_task_session; not a manual session command",
    handler: async (token, ctx) => {
      const request = pending;
      if (!request || token !== request.token || request.started) {
        ctx.ui.notify("No matching task-session handoff", "error");
        return;
      }
      request.started = true;
      try {
        await ctx.waitForIdle();
        if (ctx.sessionManager.getSessionId() !== request.sessionId) throw new Error("Session changed before handoff");
        await safe(ctx);
        const parentSession = ctx.sessionManager.getSessionFile();
        const moved = await ctx.newSession({
          parentSession,
          setup: async manager => {
            manager.appendCustomEntry("task-session-handoff", { reason: request.reason });
            if (request.queueRun) manager.appendCustomEntry("todo-queue-run", request.queueRun);
          },
          withSession: async (fresh) => {
            try { await fresh.sendUserMessage([{ type: "text", text: request.task }, ...request.images]); }
            catch (error) { fresh.ui.notify(`New task could not start: ${error instanceof Error ? error.message : String(error)}`, "error"); }
          },
        });
        if (moved.cancelled) ctx.ui.notify("Task-session handoff cancelled; task was not started", "warning");
      } finally {
        if (pending === request) pending = undefined;
      }
    },
  });

  pi.registerTool({
    name: "start_task_session",
    label: "New task session",
    description: "Start an unrelated task in a fresh native Pi session and execute it there. Use alone, before claiming a queued task. Related tasks stay here; ask the user if the relation is uncertain. Do not call for the first task of a fresh session or while previous work is unfinished. Old conversation is not copied.",
    promptGuidelines: [
      "Before starting any new task from ordinary chat or the TODO queue, assess whether it shares the previous goal, not merely the same project. Keep related fixes/tests/continuations here. Ask the user if uncertain. For an independent goal, call start_task_session alone before other work or task_queue claim, with a self-contained request and only necessary constraints/file paths; do not copy old history or secrets. The first task of a clean session needs no handoff. Do not abandon unfinished work, checks or queued messages. A failed/cancelled handoff is not permission to work on the unrelated task here.",
    ],
    parameters: Type.Object({
      task: Type.String({ minLength: 1, maxLength: 16384, description: "Self-contained new request, including necessary constraints and file paths; never the old transcript" }),
      reason: Type.String({ minLength: 1, maxLength: 2048, description: "Why this goal is independent; if uncertain, ask the user instead" }),
    }),
    async execute(_id, params, _signal, _update, ctx) {
      if (pending) throw new Error("A task-session handoff is already pending");
      const task = params.task.trim(), reason = params.reason.trim();
      if (!task || !reason) throw new Error("A nonblank task and reason are required");
      if (task.startsWith("/")) throw new Error("Provide a task request, not a slash command");
      const users = ctx.sessionManager.getBranch().filter(entry => entry.type === "message" && entry.message.role === "user");
      if (users.length < 2) throw new Error("This session is already fresh; execute its first task without another handoff");
      await safe(ctx);
      if (ctx.tools.some(tool => tool.name === "bg_status")) {
        const state = await ctx.executeTool("bg_status", {});
        const jobs = (state.result?.details as { tasks?: { status: string }[] } | undefined)?.tasks;
        if (state.isError || !Array.isArray(jobs)) throw new Error("Cannot verify background jobs; handoff refused");
        if (jobs.some(job => !["completed", "failed", "killed"].includes(job.status))) throw new Error("Background work is unfinished; wait or ask before changing sessions");
      }
      _signal?.throwIfAborted();
      if (pending) throw new Error("A task-session handoff is already pending");
      const latest = users.at(-1);
      const content = latest?.type === "message" && latest.message.role === "user" ? latest.message.content : [];
      const images = Array.isArray(content) ? content.filter(part => part.type === "image") : [];
      const runEntry = ctx.sessionManager.getBranch().findLast(entry => entry.type === "custom" && entry.customType === "todo-queue-run");
      const run = runEntry?.type === "custom" ? runEntry.data as { autoRun?: boolean; completedThisRun?: number } : undefined;
      const queueRun = run?.autoRun === true && Number.isInteger(run.completedThisRun) && run.completedThisRun! >= 0
        ? { autoRun: true as const, completedThisRun: run.completedThisRun!, handoff: true as const } : undefined;
      pending = { token: randomUUID(), sessionId: ctx.sessionManager.getSessionId(), task, reason, images, queueRun, started: false };
      pi.sendUserMessage(`/task-session-handoff ${pending.token}`, { expandPromptTemplates: true });
      return {
        content: [{ type: "text", text: "Task-session handoff scheduled. Stop work here; the native command will start the new request after this run settles. Cancellation/failure is reported separately." }],
        details: { handoff: "scheduled" },
        terminate: true,
      };
    },
  });
}
