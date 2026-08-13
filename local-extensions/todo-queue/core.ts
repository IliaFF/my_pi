import { randomUUID } from "node:crypto";

export type SectionName = "In progress" | "Pending" | "Blocked" | "Completed";
export type QueueTask = { id?: string; text: string; checked: boolean; section: SectionName };
export type QueueSnapshot = { current?: QueueTask; pending: QueueTask[]; blocked: QueueTask[]; completed: QueueTask[] };

const SECTIONS: SectionName[] = ["In progress", "Pending", "Blocked", "Completed"];
const TASK_RE = /^- \[([ xX])\] (.*?)(?:\s+<!-- pi-task:([A-Za-z0-9_-]+) -->)?\s*$/;

function splitDocument(text: string): { lines: string[]; newline: string; finalNewline: boolean } {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  return { lines: text.replace(/\r\n/g, "\n").split("\n"), newline, finalNewline: text.endsWith("\n") };
}

function joinDocument(lines: string[], newline: string, finalNewline: boolean): string {
  let normalized = lines.join("\n");
  if (!finalNewline && normalized.endsWith("\n")) normalized = normalized.slice(0, -1);
  if (finalNewline && !normalized.endsWith("\n")) normalized += "\n";
  return newline === "\n" ? normalized : normalized.replace(/\n/g, "\r\n");
}

function sectionHeaders(lines: string[]): Map<SectionName, number> {
  const result = new Map<SectionName, number>();
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^## (In progress|Pending|Blocked|Completed)\s*$/);
    if (!match) continue;
    const name = match[1] as SectionName;
    if (result.has(name)) throw new Error(`Duplicate TODO section: ${name}`);
    result.set(name, index);
  }
  return result;
}

function addMissingSections(lines: string[]): void {
  const headers = sectionHeaders(lines);
  for (const name of SECTIONS) {
    if (headers.has(name)) continue;
    if (lines.at(-1) !== "") lines.push("");
    lines.push(`## ${name}`, "");
  }
}

function taskAt(lines: string[], index: number, section: SectionName): QueueTask | undefined {
  const match = lines[index]?.match(TASK_RE);
  if (!match) return undefined;
  return { checked: match[1].toLowerCase() === "x", text: match[2].trim(), id: match[3], section };
}

function sectionBounds(lines: string[], headers: Map<SectionName, number>, name: SectionName): [number, number] {
  const start = headers.get(name)! + 1;
  const nextHeader = lines.findIndex((line, index) => index >= start && /^##\s+/.test(line));
  return [start, nextHeader < 0 ? lines.length : nextHeader];
}

function sectionTasks(lines: string[], headers: Map<SectionName, number>, name: SectionName): Array<{ index: number; task: QueueTask }> {
  const [start, end] = sectionBounds(lines, headers, name);
  const result: Array<{ index: number; task: QueueTask }> = [];
  for (let index = start; index < end; index += 1) {
    const task = taskAt(lines, index, name);
    if (task) result.push({ index, task });
  }
  return result;
}

function validateIds(lines: string[], headers: Map<SectionName, number>): void {
  const seen = new Set<string>();
  for (const section of SECTIONS) {
    for (const { task } of sectionTasks(lines, headers, section)) {
      if (!task.id) continue;
      if (seen.has(task.id)) throw new Error(`Duplicate pi-task id: ${task.id}`);
      seen.add(task.id);
    }
  }
}

function renderTask(task: QueueTask): string {
  return `- [${task.checked ? "x" : " "}] ${task.text}${task.id ? ` <!-- pi-task:${task.id} -->` : ""}`;
}

function insertionIndex(lines: string[], headers: Map<SectionName, number>, name: SectionName, atFront = false): number {
  const tasks = sectionTasks(lines, headers, name);
  if (atFront || tasks.length === 0) return headers.get(name)! + 1;
  return tasks[tasks.length - 1].index + 1;
}

function cleanTaskText(value: string): string {
  const text = value.replace(/[\x00-\x1f\x7f]/g, " ").replace(/\s+/g, " ").trim();
  if (!text) throw new Error("Task text is required");
  if (text.length > 500) throw new Error("Task text exceeds 500 characters");
  if (text.includes("<!--") || text.includes("-->")) throw new Error("HTML comments are not allowed in task text");
  return text;
}

function newId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

function parseForMutation(text: string) {
  const document = splitDocument(text);
  addMissingSections(document.lines);
  const headers = sectionHeaders(document.lines);
  validateIds(document.lines, headers);
  return { ...document, headers };
}

export function inspectTodo(text: string): QueueSnapshot {
  const { lines, headers } = parseForMutation(text);
  const currentRows = sectionTasks(lines, headers, "In progress").filter(({ task }) => !task.checked);
  if (currentRows.length > 1) throw new Error("TODO has more than one task in In progress");
  return {
    current: currentRows[0]?.task,
    pending: sectionTasks(lines, headers, "Pending").filter(({ task }) => !task.checked).map(({ task }) => task),
    blocked: sectionTasks(lines, headers, "Blocked").filter(({ task }) => !task.checked).map(({ task }) => task),
    completed: sectionTasks(lines, headers, "Completed").filter(({ task }) => task.checked).map(({ task }) => task),
  };
}

export function addTask(text: string, taskText: string, id = newId()): { text: string; task: QueueTask } {
  const document = parseForMutation(text);
  const task: QueueTask = { id, text: cleanTaskText(taskText), checked: false, section: "Pending" };
  document.lines.splice(insertionIndex(document.lines, document.headers, "Pending"), 0, renderTask(task));
  return { text: joinDocument(document.lines, document.newline, document.finalNewline), task };
}

export function claimNext(text: string, forcedId?: string): { text: string; task?: QueueTask } {
  const document = parseForMutation(text);
  const current = sectionTasks(document.lines, document.headers, "In progress").filter(({ task }) => !task.checked);
  if (current.length > 0) throw new Error(`Task already in progress: ${current[0].task.text}`);
  const pending = sectionTasks(document.lines, document.headers, "Pending").filter(({ task }) => !task.checked)[0];
  if (!pending) return { text };
  const task: QueueTask = { ...pending.task, id: pending.task.id ?? forcedId ?? newId(), section: "In progress" };
  document.lines.splice(pending.index, 1);
  const headers = sectionHeaders(document.lines);
  document.lines.splice(insertionIndex(document.lines, headers, "In progress"), 0, renderTask(task));
  return { text: joinDocument(document.lines, document.newline, document.finalNewline), task };
}

function moveCurrent(text: string, id: string, target: SectionName, options: { checked: boolean; suffix?: string; front?: boolean }): { text: string; task: QueueTask } {
  const document = parseForMutation(text);
  const current = sectionTasks(document.lines, document.headers, "In progress").filter(({ task }) => !task.checked);
  if (current.length !== 1) throw new Error("No unique task in progress");
  const row = current[0];
  if (!row.task.id || row.task.id !== id) throw new Error(`Current task id does not match ${id}`);
  const suffix = options.suffix ? ` — ${cleanTaskText(options.suffix)}` : "";
  const task: QueueTask = { ...row.task, text: `${row.task.text}${suffix}`, checked: options.checked, section: target };
  document.lines.splice(row.index, 1);
  const headers = sectionHeaders(document.lines);
  document.lines.splice(insertionIndex(document.lines, headers, target, options.front), 0, renderTask(task));
  return { text: joinDocument(document.lines, document.newline, document.finalNewline), task };
}

export function completeCurrent(text: string, id: string): { text: string; task: QueueTask } {
  return moveCurrent(text, id, "Completed", { checked: true });
}

export function blockCurrent(text: string, id: string, reason: string): { text: string; task: QueueTask } {
  return moveCurrent(text, id, "Blocked", { checked: false, suffix: `Заблокировано: ${reason}` });
}

export function releaseCurrent(text: string, id: string): { text: string; task: QueueTask } {
  return moveCurrent(text, id, "Pending", { checked: false, front: true });
}

export type MoveDirection = "up" | "down" | "top" | "bottom";

function editableRow(document: ReturnType<typeof parseForMutation>, id: string) {
  for (const section of ["Pending", "Blocked"] as const) {
    const row = sectionTasks(document.lines, document.headers, section).find(({ task }) => task.id === id);
    if (row) return row;
  }
  const protectedTask = (["In progress", "Completed"] as const)
    .flatMap((section) => sectionTasks(document.lines, document.headers, section))
    .find(({ task }) => task.id === id);
  if (protectedTask) throw new Error(`Task ${id} in ${protectedTask.task.section} cannot be edited or deleted`);
  throw new Error(`Task ${id} not found in Pending or Blocked`);
}

export function editTask(text: string, id: string, taskText: string): { text: string; task: QueueTask } {
  const document = parseForMutation(text);
  const row = editableRow(document, id);
  const task: QueueTask = { ...row.task, text: cleanTaskText(taskText) };
  document.lines[row.index] = renderTask(task);
  return { text: joinDocument(document.lines, document.newline, document.finalNewline), task };
}

export function deleteTask(text: string, id: string): { text: string; task: QueueTask } {
  const document = parseForMutation(text);
  const row = editableRow(document, id);
  document.lines.splice(row.index, 1);
  return { text: joinDocument(document.lines, document.newline, document.finalNewline), task: row.task };
}

export function movePendingTask(text: string, id: string, direction: MoveDirection): { text: string; task: QueueTask; changed: boolean } {
  const document = parseForMutation(text);
  const rows = sectionTasks(document.lines, document.headers, "Pending").filter(({ task }) => !task.checked);
  const from = rows.findIndex(({ task }) => task.id === id);
  if (from < 0) throw new Error(`Pending task ${id} not found`);
  let to = from;
  if (direction === "up") to = Math.max(0, from - 1);
  if (direction === "down") to = Math.min(rows.length - 1, from + 1);
  if (direction === "top") to = 0;
  if (direction === "bottom") to = rows.length - 1;
  if (to === from) return { text, task: rows[from].task, changed: false };
  const ordered = rows.map(({ task }) => task);
  const [task] = ordered.splice(from, 1);
  ordered.splice(to, 0, task);
  rows.forEach((row, index) => { document.lines[row.index] = renderTask(ordered[index]); });
  return { text: joinDocument(document.lines, document.newline, document.finalNewline), task, changed: true };
}
