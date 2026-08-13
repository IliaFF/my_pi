import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { readFile } from "node:fs/promises";
import { addTask, blockCurrent, claimNext, completeCurrent, deleteTask, editTask, inspectTodo, movePendingTask, releaseCurrent, type MoveDirection, type QueueTask } from "./core.ts";
import { findTodoPath, mutateTodo } from "./store.ts";

const MAX_RUN_TASKS = 5;
const ACTIONS = ["list", "add", "edit", "delete", "move", "claim", "complete", "block", "release"] as const;

const TaskQueueParams = Type.Object({
  action: StringEnum(ACTIONS),
  id: Type.Optional(Type.String({ description: "Stable pi-task id" })),
  text: Type.Optional(Type.String({ description: "Task text for add" })),
  summary: Type.Optional(Type.String({ description: "Completion summary" })),
  evidence: Type.Optional(Type.Array(Type.String(), { description: "Passing checks or direct evidence" })),
  reason: Type.Optional(Type.String({ description: "Concrete blocker reason" })),
  position: Type.Optional(StringEnum(["up", "down", "top", "bottom"] as const, { description: "Pending reorder direction" })),
});

type Context = ExtensionContext & { isProjectTrusted?: () => boolean };

function result(text: string, details: Record<string, unknown> = {}) {
  return { content: [{ type: "text" as const, text }], details };
}

function requireText(value: string | undefined, name: string): string {
  const text = value?.trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

function formatTask(task: QueueTask): string {
  return `${task.id ? `#${task.id} ` : ""}${task.text}`;
}

function formatStatus(snapshot: ReturnType<typeof inspectTodo>, autoRun: boolean, completed: number): string {
  return [
    `Queue: ${autoRun ? `RUNNING ${completed}/${MAX_RUN_TASKS}` : "PAUSED"}`,
    `Current: ${snapshot.current ? formatTask(snapshot.current) : "none"}`,
    `Pending: ${snapshot.pending.length}`,
    `Blocked: ${snapshot.blocked.length}`,
  ].join("\n");
}

function formatList(snapshot: ReturnType<typeof inspectTodo>, autoRun: boolean, completed: number): string {
  const lines = [formatStatus(snapshot, autoRun, completed), ""];
  const addSection = (title: string, tasks: QueueTask[]) => {
    lines.push(`${title}:`);
    if (tasks.length === 0) lines.push("  —");
    else tasks.forEach((task, index) => lines.push(`  ${index + 1}. ${formatTask(task)}`));
    lines.push("");
  };
  addSection("In progress", snapshot.current ? [snapshot.current] : []);
  addSection("Pending", snapshot.pending);
  addSection("Blocked", snapshot.blocked);
  addSection("Completed (queue-managed)", snapshot.completed.filter((task) => task.id));
  return lines.join("\n").trimEnd();
}

export default function todoQueueExtension(pi: ExtensionAPI): void {
  let autoRun = false;
  let completedThisRun = 0;
  let pendingAdvance = false;
  let activeTaskId: string | undefined;
  let terminalHandled = false;
  let dispatching = false;

  const trusted = (ctx: Context) => ctx.isProjectTrusted?.() !== false;

  const todoPath = async (ctx: Context) => {
    if (!trusted(ctx)) throw new Error("Project is not trusted; TODO queue mutation refused");
    return findTodoPath(ctx.cwd);
  };

  const snapshot = async (ctx: Context) => inspectTodo(await readFile(await todoPath(ctx), "utf8"));

  const notifyError = (ctx: Context, error: unknown) => {
    ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
  };

  const dispatchPrompt = (task: QueueTask, resume: boolean): string => [
    `[TODO QUEUE ${task.id}]`,
    resume ? "Продолжи текущую задачу и доведи её до проверенного результата." : "Возьми эту задачу и доведи её до проверенного результата.",
    "",
    task.text,
    "",
    "Не перемещай этот пункт между разделами TODO.md вручную.",
    "После успешных проверок вызови task_queue action=complete с этим id, кратким summary и непустым evidence.",
    "Если есть устойчивое внешнее препятствие — вызови task_queue action=block с этим id и reason.",
    "Обычное окончание ответа не завершает задачу.",
  ].join("\n");

  const dispatch = async (ctx: Context, resume = false): Promise<QueueTask | undefined> => {
    if (dispatching) throw new Error("Queue dispatch is already running");
    if (!ctx.isIdle() || ctx.hasPendingMessages()) throw new Error("Pi is busy; wait until it settles");
    dispatching = true;
    try {
      const path = await todoPath(ctx);
      let task: QueueTask | undefined;
      if (resume) {
        task = inspectTodo(await readFile(path, "utf8")).current;
        if (!task?.id) throw new Error("Current task has no queue id; release it or assign it through /queue next");
      } else {
        task = await mutateTodo(path, (text) => {
          const changed = claimNext(text);
          return { text: changed.text, value: changed.task };
        });
      }
      if (!task) {
        autoRun = false;
        ctx.ui.notify("TODO queue is empty", "info");
        return undefined;
      }
      activeTaskId = task.id;
      terminalHandled = false;
      pi.sendUserMessage(dispatchPrompt(task, resume));
      return task;
    } finally {
      dispatching = false;
    }
  };

  pi.on("input", async (event, ctx) => {
    if (!event.text.startsWith("+ ")) return { action: "continue" as const };
    const text = event.text.slice(2).trim();
    if (!text) {
      ctx.ui.notify("Usage: + <task>", "warning");
      return { action: "handled" as const };
    }
    try {
      const path = await todoPath(ctx);
      const task = await mutateTodo(path, (content) => {
        const changed = addTask(content, text);
        return { text: changed.text, value: changed.task };
      });
      ctx.ui.notify(`Queued ${formatTask(task)}`, "info");
    } catch (error) {
      notifyError(ctx, error);
    }
    return { action: "handled" as const };
  });

  pi.registerCommand("queue", {
    description: "Manage project TODO queue: list, add, edit, delete, move, next, run, pause, resume, skip, status",
    handler: async (args, ctx) => {
      const trimmed = args.trim();
      const [command = "list", ...rest] = trimmed ? trimmed.split(/\s+/) : [];
      try {
        if (command === "add") {
          const text = requireText(rest.join(" "), "task text");
          const path = await todoPath(ctx);
          const task = await mutateTodo(path, (content) => {
            const changed = addTask(content, text);
            return { text: changed.text, value: changed.task };
          });
          ctx.ui.notify(`Queued ${formatTask(task)}`, "info");
          return;
        }
        if (command === "list") {
          ctx.ui.notify(formatList(await snapshot(ctx), autoRun, completedThisRun), "info");
          return;
        }
        if (command === "edit") {
          const [id, ...words] = rest;
          const path = await todoPath(ctx);
          const task = await mutateTodo(path, (content) => {
            const update = editTask(content, requireText(id, "id"), requireText(words.join(" "), "task text"));
            return { text: update.text, value: update.task };
          });
          ctx.ui.notify(`Edited ${formatTask(task)}`, "info");
          return;
        }
        if (command === "delete") {
          if (rest.length !== 1) throw new Error("Usage: /queue delete <id>");
          const path = await todoPath(ctx);
          const task = await mutateTodo(path, (content) => {
            const update = deleteTask(content, requireText(rest[0], "id"));
            return { text: update.text, value: update.task };
          });
          ctx.ui.notify(`Deleted ${formatTask(task)}`, "info");
          return;
        }
        if (command === "move") {
          if (rest.length !== 2 || !["up", "down", "top", "bottom"].includes(rest[1])) throw new Error("Usage: /queue move <id> up|down|top|bottom");
          const path = await todoPath(ctx);
          const moved = await mutateTodo(path, (content) => {
            const update = movePendingTask(content, requireText(rest[0], "id"), rest[1] as MoveDirection);
            return { text: update.text, value: update };
          });
          ctx.ui.notify(moved.changed ? `Moved ${formatTask(moved.task)} ${rest[1]}` : "Task is already at that position", "info");
          return;
        }
        if (command === "next") {
          autoRun = false;
          await dispatch(ctx);
          return;
        }
        if (command === "run") {
          if ((await snapshot(ctx)).current) throw new Error("A task is already in progress; use /queue resume or /queue skip");
          autoRun = true;
          completedThisRun = 0;
          pendingAdvance = false;
          try { await dispatch(ctx); } catch (error) { autoRun = false; throw error; }
          return;
        }
        if (command === "resume") {
          autoRun = true;
          completedThisRun = 0;
          pendingAdvance = false;
          try { await dispatch(ctx, true); } catch (error) { autoRun = false; throw error; }
          return;
        }
        if (command === "pause") {
          autoRun = false;
          pendingAdvance = false;
          ctx.ui.notify("TODO queue paused", "info");
          return;
        }
        if (command === "skip") {
          const path = await todoPath(ctx);
          const current = inspectTodo(await readFile(path, "utf8")).current;
          if (!current?.id) throw new Error("No queue-owned task in progress");
          await mutateTodo(path, (content) => {
            const changed = releaseCurrent(content, current.id!);
            return { text: changed.text, value: changed.task };
          });
          autoRun = false;
          pendingAdvance = false;
          activeTaskId = undefined;
          ctx.ui.notify("Current task returned to Pending; queue paused", "info");
          return;
        }
        if (command !== "status") throw new Error("Usage: /queue [list|add|edit|delete|move|next|run|pause|resume|skip|status]");
        ctx.ui.notify(formatStatus(await snapshot(ctx), autoRun, completedThisRun), "info");
      } catch (error) {
        notifyError(ctx, error);
      }
    },
  });

  pi.registerTool({
    name: "task_queue",
    label: "TODO Queue",
    description: "Manage project TODO.md queue. Complete only current matching id after passing checks; block on concrete external impediments.",
    parameters: TaskQueueParams,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      try {
        const path = await todoPath(ctx);
        if (params.action === "list") {
          const state = inspectTodo(await readFile(path, "utf8"));
          return result(formatList(state, autoRun, completedThisRun), state as unknown as Record<string, unknown>);
        }
        if (params.action === "add") {
          const changed = await mutateTodo(path, (content) => {
            const update = addTask(content, requireText(params.text, "text"));
            return { text: update.text, value: update.task };
          });
          return result(`Queued ${formatTask(changed)}`, { task: changed });
        }
        if (params.action === "edit") {
          const changed = await mutateTodo(path, (content) => {
            const update = editTask(content, requireText(params.id, "id"), requireText(params.text, "text"));
            return { text: update.text, value: update.task };
          });
          return result(`Edited ${formatTask(changed)}`, { task: changed });
        }
        if (params.action === "delete") {
          const changed = await mutateTodo(path, (content) => {
            const update = deleteTask(content, requireText(params.id, "id"));
            return { text: update.text, value: update.task };
          });
          return result(`Deleted ${formatTask(changed)}`, { task: changed });
        }
        if (params.action === "move") {
          const position = params.position as MoveDirection | undefined;
          if (!position) throw new Error("position is required for move");
          const moved = await mutateTodo(path, (content) => {
            const update = movePendingTask(content, requireText(params.id, "id"), position);
            return { text: update.text, value: update };
          });
          return result(moved.changed ? `Moved ${formatTask(moved.task)} ${position}` : "Task is already at that position", { task: moved.task, changed: moved.changed });
        }
        if (params.action === "claim") {
          const changed = await mutateTodo(path, (content) => {
            const update = claimNext(content);
            return { text: update.text, value: update.task };
          });
          return changed ? result(`Claimed ${formatTask(changed)}`, { task: changed }) : result("Queue is empty");
        }
        const id = requireText(params.id, "id");
        if (params.action === "complete") {
          requireText(params.summary, "summary");
          const evidence = params.evidence?.map((item) => item.trim()).filter(Boolean) ?? [];
          if (evidence.length === 0) throw new Error("At least one concrete validation evidence item is required");
          const changed = await mutateTodo(path, (content) => {
            const update = completeCurrent(content, id);
            return { text: update.text, value: update.task };
          });
          terminalHandled = activeTaskId === id;
          pendingAdvance = autoRun;
          if (terminalHandled) completedThisRun += 1;
          return result(`Completed ${formatTask(changed)}\nEvidence: ${evidence.join("; ")}`, { task: changed, summary: params.summary, evidence });
        }
        if (params.action === "block") {
          const changed = await mutateTodo(path, (content) => {
            const update = blockCurrent(content, id, requireText(params.reason, "reason"));
            return { text: update.text, value: update.task };
          });
          terminalHandled = activeTaskId === id;
          autoRun = false;
          pendingAdvance = false;
          return result(`Blocked ${formatTask(changed)}; queue paused`, { task: changed, reason: params.reason });
        }
        const changed = await mutateTodo(path, (content) => {
          const update = releaseCurrent(content, id);
          return { text: update.text, value: update.task };
        });
        terminalHandled = activeTaskId === id;
        autoRun = false;
        pendingAdvance = false;
        return result(`Released ${formatTask(changed)}; queue paused`, { task: changed });
      } catch (error) {
        return result(`Error: ${error instanceof Error ? error.message : String(error)}`, { error: true });
      }
    },
  });

  pi.on("agent_settled", async (_event, ctx) => {
    if (pendingAdvance && autoRun) {
      pendingAdvance = false;
      activeTaskId = undefined;
      terminalHandled = false;
      if (completedThisRun >= MAX_RUN_TASKS) {
        autoRun = false;
        ctx.ui.notify(`TODO queue paused at safety limit ${MAX_RUN_TASKS}`, "warning");
        return;
      }
      try {
        await dispatch(ctx);
      } catch (error) {
        autoRun = false;
        notifyError(ctx, error);
      }
      return;
    }
    if (autoRun && activeTaskId && !terminalHandled) {
      autoRun = false;
      pendingAdvance = false;
      ctx.ui.notify("Agent settled without task_queue.complete/block; queue paused and task remains In progress", "warning");
    }
    activeTaskId = undefined;
    terminalHandled = false;
  });

  pi.on("session_shutdown", () => {
    autoRun = false;
    pendingAdvance = false;
  });
}
