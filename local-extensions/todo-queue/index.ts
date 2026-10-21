import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { queueChecks } from "./checks.ts";
import { addTask, blockCurrent, claimNext, completeCurrent, deleteTask, editTask, inspectTodo, movePendingTask, releaseCurrent, reopenBlocked, type MoveDirection, type QueueTask } from "./core.ts";
import { findTodoPath, mutateTodo } from "./store.ts";
import { createQueuePanel } from "./panel.ts";

const MAX_RUN_TASKS = 5;
const ACTIONS = ["list", "add", "edit", "delete", "move", "claim", "reopen", "check", "checks", "supersede", "complete", "block", "release"] as const;

const TaskQueueParams = Type.Object({
  action: StringEnum(ACTIONS),
  id: Type.Optional(Type.String({ description: "Stable pi-task id; claim selects this pending task, omitted means FIFO" })),
  text: Type.Optional(Type.String({ description: "Task text for add" })),
  summary: Type.Optional(Type.String({ description: "Completion summary" })),
  evidence: Type.Optional(Type.Array(Type.String(), { description: "Passing checks or direct evidence" })),
  reason: Type.Optional(Type.String({ description: "Concrete blocker, reopen or check supersession reason" })),
  checkId: Type.Optional(Type.String({ description: "Obsolete successful check or unstarted failed preflight id for supersede" })),
  replacementId: Type.Optional(Type.String({ description: "Fresh successful latest check id, same task; same cwd unless replacing an unstarted failed preflight" })),
  command: Type.Optional(Type.String({ maxLength: 8192, description: "Explicit local shell check; launched through bg_run with automatic completion follow-up" })),
  cwd: Type.Optional(Type.String({ description: "Project/check working directory, defaults to session cwd; snapshot covers the whole Git worktree or directory" })),
  timeoutSeconds: Type.Optional(Type.Integer({ minimum: 1, maximum: 86400, description: "Finite check deadline, default 600 seconds" })),
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

function formatList(snapshot: ReturnType<typeof inspectTodo>, autoRun: boolean, completed: number, includeCompleted = true): string {
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
  if (includeCompleted) addSection("Completed (queue-managed)", snapshot.completed.filter((task) => task.id));
  return lines.join("\n").trimEnd();
}

export default function todoQueueExtension(pi: ExtensionAPI): void {
  let autoRun = false;
  let completedThisRun = 0;
  let pendingAdvance = false;
  let activeTaskId: string | undefined;
  let terminalHandled = false;
  let dispatching = false;
  const panel = createQueuePanel();
  const checks = queueChecks(pi);
  const recordRun = () => pi.appendEntry("todo-queue-run", { autoRun, completedThisRun });
  pi.on("session_start", (_event, ctx) => {
    const entry = ctx.sessionManager.getBranch().findLast(item => item.type === "custom" && item.customType === "todo-queue-run");
    const data = entry?.type === "custom" ? entry.data as { handoff?: boolean; autoRun?: boolean; completedThisRun?: number } : undefined;
    if (data?.handoff === true && data.autoRun === true && Number.isInteger(data.completedThisRun) && data.completedThisRun! >= 0 && data.completedThisRun! < MAX_RUN_TASKS) {
      autoRun = true;
      completedThisRun = data.completedThisRun!;
    }
    recordRun(); // Consume handoff markers and clear stale state on reload/resume.
    return panel.start(ctx);
  });
  pi.registerShortcut("ctrl+shift+t", {
    description: "Collapse/expand project TODO panel",
    handler: (ctx) => panel.toggle(ctx),
  });

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
    `[TODO QUEUE ${task.id ?? "FIFO candidate without id"}]`,
    resume ? "Продолжи текущую задачу и доведи её до проверенного результата." : "Это кандидат из Pending, ещё не взятый в работу. Сначала оцени связь с предыдущей общей целью: связанную задачу оставь здесь; при сомнении спроси пользователя; для независимой вызови start_task_session до claim. Затем вызови task_queue action=claim с указанным id (без id для FIFO, если его нет) и работай в выбранной сессии.",
    "",
    task.text,
    "",
    "После claim используй настоящий id из результата инструмента, не placeholder кандидата. Не перемещай этот пункт между разделами TODO.md вручную.",
    "Для проверок кода используй task_queue action=check с id, command и cwd проекта; это фоновая проверка со снимком файлов. Жди уведомления, не опрашивай статус циклически.",
    "После успешных проверок вызови task_queue action=complete с этим id, кратким summary и непустым evidence. Устаревшие/неуспешные записанные проверки не засчитываются.",
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
        const state = inspectTodo(await readFile(path, "utf8"));
        if (state.current) throw new Error("A task is already in progress; use /queue resume or /queue skip");
        task = state.pending[0];
      }
      if (!task) {
        autoRun = false;
        recordRun();
        ctx.ui.notify("TODO queue is empty", "info");
        return undefined;
      }
      recordRun();
      if (resume) checks.invalidate(ctx, task.id!);
      activeTaskId = resume ? task.id : undefined;
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
    description: "Manage project TODO queue: list, panel, add, edit, delete, move, next, run, pause, resume, skip, status",
    handler: async (args, ctx) => {
      const trimmed = args.trim();
      const [command = "list", ...rest] = trimmed ? trimmed.split(/\s+/) : [];
      try {
        if (command === "panel") {
          await panel.toggle(ctx);
          return;
        }
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
          ctx.ui.notify(formatList(await snapshot(ctx), autoRun, completedThisRun, false), "info");
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
          recordRun();
          await dispatch(ctx);
          return;
        }
        if (command === "run") {
          if ((await snapshot(ctx)).current) throw new Error("A task is already in progress; use /queue resume or /queue skip");
          autoRun = true;
          completedThisRun = 0;
          pendingAdvance = false;
          try { await dispatch(ctx); } catch (error) { autoRun = false; recordRun(); throw error; }
          return;
        }
        if (command === "resume") {
          autoRun = true;
          completedThisRun = 0;
          pendingAdvance = false;
          try { await dispatch(ctx, true); } catch (error) { autoRun = false; recordRun(); throw error; }
          return;
        }
        if (command === "pause") {
          autoRun = false;
          pendingAdvance = false;
          recordRun();
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
          checks.invalidate(ctx, current.id);
          autoRun = false;
          pendingAdvance = false;
          activeTaskId = undefined;
          recordRun();
          ctx.ui.notify("Current task returned to Pending; queue paused", "info");
          return;
        }
        if (command !== "status") throw new Error("Usage: /queue [list|panel|add|edit|delete|move|next|run|pause|resume|skip|status]");
        ctx.ui.notify(formatStatus(await snapshot(ctx), autoRun, completedThisRun), "info");
      } catch (error) {
        notifyError(ctx, error);
      }
    },
  });

  pi.registerTool({
    name: "task_queue",
    label: "TODO Queue",
    description: "Manage project TODO.md queue. Claim a specific pending id or omit id for FIFO; never reorder to select. Explicit reopen (blocked id, reason) requires an empty current slot and fresh recorded validation; never auto-reopen. Use check (id, command, cwd) for a snapshot-bound local background check; wait for notification, never poll. checks inspects jobs once. supersede links an obsolete stable passed check to a fresh passed check of the same task/cwd with a reason. Only a provably unstarted failed preflight may change cwd; never bypass launched failed/unknown/running checks. Complete only current matching id with current successful checks or direct evidence for tasks without recorded checks; complete does not change recorded cwd. Block on concrete external impediments.",
    reachesTools: () => ["bg_run", "bg_status"],
    parameters: TaskQueueParams,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
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
          const update = claimNext(content, undefined, params.id === undefined ? undefined : requireText(params.id, "id"));
          return { text: update.text, value: update.task };
        });
        if (changed?.id) {
          checks.invalidate(ctx, changed.id);
          activeTaskId = changed.id;
          terminalHandled = false;
        }
        return changed ? result(`Claimed ${formatTask(changed)}`, { task: changed }) : result("Queue is empty");
      }
      const id = requireText(params.id, "id");
      if (params.action === "reopen") {
        const reason = requireText(params.reason, "reason");
        const changed = await mutateTodo(path, async (content) => {
          const update = reopenBlocked(content, id);
          if ((await checks.inspect(ctx, path, update.task)).some(record => record.status === "running")) {
            throw new Error("Cannot reopen while a check is running; wait for its notification");
          }
          return { text: update.text, value: update.task };
        });
        checks.reopen(changed, reason);
        activeTaskId = changed.id;
        terminalHandled = false;
        autoRun = false;
        pendingAdvance = false;
        recordRun();
        return result(`Reopened ${formatTask(changed)}; fresh recorded check required; queue paused`, { task: changed, reason });
      }
      if (params.action === "check" || params.action === "checks" || params.action === "supersede") {
        return mutateTodo(path, async (content) => {
          const task = inspectTodo(content).current;
          if (!task?.id || task.id !== id) throw new Error("Check requires the current matching task id");
          if (params.action === "check") {
            const record = await checks.start(ctx, path, task, requireText(params.command, "command"), resolve(ctx.cwd, params.cwd ?? "."), params.timeoutSeconds ?? 600);
            return { text: content, value: result(`Check ${record.id} started as background job ${record.jobId}; wait for its notification. Do not change the tested scope.`, { check: record }) };
          }
          if (params.action === "supersede") {
            const record = await checks.supersede(ctx, path, task, requireText(params.checkId, "checkId"), requireText(params.replacementId, "replacementId"), requireText(params.reason, "reason"));
            return { text: content, value: result(`Check ${record.id} superseded by ${record.supersededBy}: ${record.supersededReason}`, { check: record }) };
          }
          const records = await checks.inspect(ctx, path, task);
          return { text: content, value: result(records.map(r => `${r.id}: ${r.status}, exit=${r.exitCode ?? "unknown"}, job=${r.jobId ?? "unknown"}${r.supersededBy ? `, supersededBy=${r.supersededBy}: ${r.supersededReason}` : ""}`).join("\n") || "No recorded checks; direct evidence only", { checks: records }) };
        });
      }
      if (params.action === "complete") {
        requireText(params.summary, "summary");
        const evidence = params.evidence?.map((item) => item.trim()).filter(Boolean) ?? [];
        if (evidence.length === 0) throw new Error("At least one concrete validation evidence item is required");
        const changed = await mutateTodo(path, async (content) => {
          const update = completeCurrent(content, id);
          await checks.validate(ctx, path, update.task);
          return { text: update.text, value: update.task };
        });
        terminalHandled = activeTaskId === id;
        pendingAdvance = autoRun;
        if (terminalHandled) completedThisRun += 1;
        recordRun();
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
        recordRun();
        return result(`Blocked ${formatTask(changed)}; queue paused`, { task: changed, reason: params.reason });
      }
      const changed = await mutateTodo(path, (content) => {
        const update = releaseCurrent(content, id);
        return { text: update.text, value: update.task };
      });
      checks.invalidate(ctx, id);
      terminalHandled = activeTaskId === id;
      autoRun = false;
      pendingAdvance = false;
      recordRun();
      return result(`Released ${formatTask(changed)}; queue paused`, { task: changed });
    },
  });

  pi.on("agent_settled", async (_event, ctx) => {
    if (pendingAdvance && autoRun) {
      pendingAdvance = false;
      activeTaskId = undefined;
      terminalHandled = false;
      if (completedThisRun >= MAX_RUN_TASKS) {
        autoRun = false;
        recordRun();
        ctx.ui.notify(`TODO queue paused at safety limit ${MAX_RUN_TASKS}`, "warning");
        return;
      }
      try {
        await dispatch(ctx);
      } catch (error) {
        autoRun = false;
        recordRun();
        notifyError(ctx, error);
      }
      return;
    }
    if (autoRun && activeTaskId && !terminalHandled) {
      autoRun = false;
      pendingAdvance = false;
      recordRun();
      ctx.ui.notify("Agent settled without task_queue.complete/block; queue paused and task remains In progress", "warning");
    }
    activeTaskId = undefined;
    terminalHandled = false;
  });

  pi.on("session_shutdown", () => {
    panel.stop();
    autoRun = false;
    pendingAdvance = false;
  });
}
