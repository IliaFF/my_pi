import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { Type } from "typebox";
import { truncateTail, withFileMutationQueue, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";

const PROFILE_PATH = ".pi/project-loop.json";
const AUTO_MAX_CHARS = 5_000;
const TOOL_MAX_CHARS = 14_000;
const MAX_PROFILE_FILES = 8;
const MAX_FILE_EXCERPT = 1_200;
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 300_000;
const IGNORE_NAMES = new Set([".git", "node_modules", ".venv", "venv", "dist", "build", "target", "__pycache__"]);

type ValidationSpec = { command: string; timeoutMs?: number };
type ProjectProfile = {
  version: 1;
  context?: { files?: string[]; maxChars?: number };
  validation?: {
    targeted?: Record<string, string | ValidationSpec>;
    finish?: Array<string | ({ name?: string } & ValidationSpec)>;
  };
};
type NamedValidation = ValidationSpec & { name: string; source: "profile" | "autodetect" };
type ExecResult = { name: string; command: string; code: number; durationMs: number; output: string; truncated: boolean };

function bounded(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 48))}\n… [bounded: ${text.length} chars total]`;
}

function cleanLine(text: string): string {
  return text.replace(/[\r\n\t]+/g, " ").trim();
}

function queryHints(text: string): string {
  return (text.toLowerCase().match(/[\p{L}\p{N}_-]{4,}/gu) ?? []).slice(0, 12).join(",");
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function findProjectRoot(cwd: string): string {
  let current = resolve(cwd);
  while (true) {
    if (existsSync(join(current, PROFILE_PATH)) || existsSync(join(current, ".git"))) return current;
    const parent = dirname(current);
    if (parent === current) return resolve(cwd);
    current = parent;
  }
}

function safeProjectPath(root: string, input: string): string {
  const absolute = resolve(root, input.replace(/^@/, ""));
  const rel = relative(root, absolute);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) return absolute;
  throw new Error(`Path outside project root: ${input}`);
}

function parseProfile(root: string, trusted: boolean): { profile?: ProjectProfile; error?: string } {
  const path = join(root, PROFILE_PATH);
  if (!existsSync(path)) return {};
  if (!trusted) return { error: `${PROFILE_PATH} ignored: project is not trusted` };
  try {
    const value = JSON.parse(readFileSync(path, "utf8")) as ProjectProfile;
    if (!value || value.version !== 1 || typeof value !== "object") return { error: `${PROFILE_PATH}: version must be 1` };
    return { profile: value };
  } catch (error) {
    return { error: `${PROFILE_PATH}: ${error instanceof Error ? error.message : String(error)}` };
  }
}

function normalizeSpec(name: string, value: string | ValidationSpec, source: "profile" | "autodetect" = "profile"): NamedValidation | undefined {
  const spec = typeof value === "string" ? { command: value } : value;
  if (!spec || typeof spec.command !== "string" || !spec.command.trim()) return undefined;
  return { name, command: spec.command.trim(), timeoutMs: spec.timeoutMs, source };
}

function profileTarget(profile: ProjectProfile | undefined, target: string | undefined): NamedValidation | undefined {
  const entries = Object.entries(profile?.validation?.targeted ?? {});
  if (entries.length === 0) return undefined;
  if (target) {
    const found = entries.find(([name]) => name === target);
    return found ? normalizeSpec(found[0], found[1]) : undefined;
  }
  return normalizeSpec(entries[0]![0], entries[0]![1]);
}

function profileFinish(profile: ProjectProfile | undefined): NamedValidation[] {
  return (profile?.validation?.finish ?? []).flatMap((value, index) => {
    const name = typeof value === "object" && typeof value.name === "string" ? value.name : `finish-${index + 1}`;
    const spec = normalizeSpec(name, value);
    return spec ? [spec] : [];
  });
}

function topLevel(root: string): string[] {
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => !IGNORE_NAMES.has(entry.name))
      .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
      .slice(0, 40)
      .map((entry) => `${entry.isDirectory() ? "d" : "f"} ${entry.name}`);
  } catch {
    return [];
  }
}

function manifestSummary(root: string): string[] {
  const result: string[] = [];
  const packagePath = join(root, "package.json");
  if (existsSync(packagePath)) {
    try {
      const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as { name?: string; scripts?: Record<string, unknown>; packageManager?: string };
      result.push(`node ${pkg.name ?? basename(root)}; scripts=${Object.keys(pkg.scripts ?? {}).slice(0, 12).join(",") || "none"}${pkg.packageManager ? `; manager=${pkg.packageManager}` : ""}`);
    } catch { result.push("node package.json (invalid JSON)"); }
  }
  if (existsSync(join(root, "pyproject.toml"))) result.push("python pyproject.toml");
  else if (existsSync(join(root, "requirements.txt"))) result.push("python requirements.txt");
  if (existsSync(join(root, "Cargo.toml"))) result.push("rust Cargo.toml");
  if (existsSync(join(root, "go.mod"))) result.push("go go.mod");
  if (existsSync(join(root, "pom.xml"))) result.push("java pom.xml");
  return result;
}

function profileExcerpts(root: string, profile: ProjectProfile | undefined): string[] {
  const files = (profile?.context?.files ?? []).slice(0, MAX_PROFILE_FILES);
  const excerpts: string[] = [];
  for (const configured of files) {
    try {
      const path = safeProjectPath(root, configured);
      if (!statSync(path).isFile()) continue;
      excerpts.push(`--- ${relative(root, path)} ---\n${bounded(readFileSync(path, "utf8"), MAX_FILE_EXCERPT)}`);
    } catch {}
  }
  return excerpts;
}

async function gitStatus(pi: ExtensionAPI, root: string, signal?: AbortSignal): Promise<string[]> {
  if (!existsSync(join(root, ".git"))) return [];
  const result = await pi.exec("git", ["status", "--short", "--branch", "--untracked-files=normal"], { cwd: root, timeout: 2_000, signal });
  return `${result.stdout}\n${result.stderr}`.split("\n").filter(Boolean).slice(0, 20).map(cleanLine);
}

export async function buildProjectPreflight(pi: ExtensionAPI, ctx: ExtensionContext, query = ""): Promise<string> {
  const root = findProjectRoot(ctx.cwd);
  const parsed = parseProfile(root, ctx.isProjectTrusted());
  const status = await gitStatus(pi, root, ctx.signal).catch(() => []);
  const targeted = Object.keys(parsed.profile?.validation?.targeted ?? {}).slice(0, 10);
  const finish = profileFinish(parsed.profile).map((item) => item.name).slice(0, 10);
  const sections = [
    `[project-preflight] root=${root}`,
    `task-hints=${queryHints(query) || "n/a"}`,
    `stack=${manifestSummary(root).join(" | ") || "unknown"}`,
    `git=${status.join(" | ") || "not available/clean"}`,
    `top=${topLevel(root).join(" | ") || "unavailable"}`,
    `profile=${parsed.profile ? PROFILE_PATH : parsed.error ?? "none"}; targeted=${targeted.join(",") || "autodetect"}; finish=${finish.join(",") || "autodetect"}`,
    ...profileExcerpts(root, parsed.profile),
    "Use project_context/project_probe for deeper bounded discovery; prefer edit_verify/targeted_test/finish_gate to collapse edit-validation rounds.",
  ];
  const configuredMax = parsed.profile?.context?.maxChars;
  const maxChars = Math.max(1_500, Math.min(AUTO_MAX_CHARS, typeof configuredMax === "number" ? configuredMax : AUTO_MAX_CHARS));
  return bounded(sections.join("\n"), maxChars);
}

function relevantNames(root: string, query: string, limit: number): string[] {
  const terms = (query.toLowerCase().match(/[\p{L}\p{N}_-]{3,}/gu) ?? []).slice(0, 12);
  if (terms.length === 0) return [];
  const found: Array<{ path: string; score: number }> = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 4 || found.length > 500) return;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (IGNORE_NAMES.has(entry.name) || entry.name.startsWith(".git")) continue;
      const path = join(dir, entry.name);
      const rel = relative(root, path);
      const score = terms.reduce((sum, term) => sum + (rel.toLowerCase().includes(term) ? 1 : 0), 0);
      if (entry.isFile() && score > 0) found.push({ path: rel, score });
      else if (entry.isDirectory()) walk(path, depth + 1);
    }
  };
  walk(root, 0);
  return found.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, limit).map((item) => item.path);
}

async function searchExcerpts(pi: ExtensionAPI, root: string, query: string, maxFiles: number, signal?: AbortSignal): Promise<string> {
  const names = relevantNames(root, query, maxFiles);
  if (!query.trim()) return names.join("\n");
  const pattern = (query.match(/[\p{L}\p{N}_-]{3,}/gu) ?? []).slice(0, 12).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const rg = pattern ? await pi.exec("rg", ["-n", "--no-heading", "--color=never", "--max-count", "3", "--glob", "!node_modules/**", "--glob", "!.git/**", "--glob", "!dist/**", "--glob", "!build/**", "--", pattern, "."], { cwd: root, timeout: 5_000, signal }).catch(() => undefined) : undefined;
  const matches = rg ? `${rg.stdout}\n${rg.stderr}`.split("\n").filter(Boolean).slice(0, maxFiles * 4).join("\n") : "";
  return bounded([names.length ? `ranked paths:\n${names.join("\n")}` : "", matches ? `content matches:\n${matches}` : ""].filter(Boolean).join("\n"), TOOL_MAX_CHARS / 2);
}

function changedFilesFromStatus(status: string[]): string[] {
  return status.flatMap((line) => {
    if (line.startsWith("##") || line.length < 4) return [];
    const raw = line.slice(3).trim().split(" -> ").at(-1) ?? "";
    return raw ? [raw.replace(/^"|"$/g, "")] : [];
  }).slice(0, 50);
}

function autodetectValidation(root: string, paths: string[], finish: boolean): NamedValidation[] {
  const safePaths = paths.filter(Boolean).slice(0, 30);
  const commands: NamedValidation[] = [{ name: "diff-check", command: safePaths.length ? `git diff --check -- ${safePaths.map(shellQuote).join(" ")}` : "git diff --check", source: "autodetect", timeoutMs: 30_000 }];
  const python = safePaths.filter((path) => extname(path) === ".py");
  if (python.length) commands.push({ name: "python-compile", command: `python3 -m py_compile ${python.map(shellQuote).join(" ")}`, source: "autodetect", timeoutMs: 30_000 });
  const javascript = safePaths.filter((path) => [".js", ".mjs", ".cjs"].includes(extname(path)));
  if (javascript.length) commands.push({ name: "node-check", command: javascript.map((path) => `node --check ${shellQuote(path)}`).join(" && "), source: "autodetect", timeoutMs: 30_000 });
  const typescript = safePaths.some((path) => [".ts", ".tsx"].includes(extname(path)));
  if (typescript && existsSync(join(root, "node_modules", ".bin", "tsc"))) commands.push({ name: "tsc", command: "./node_modules/.bin/tsc --noEmit --pretty false", source: "autodetect", timeoutMs: finish ? DEFAULT_TIMEOUT_MS : 60_000 });
  return commands;
}

async function runValidation(pi: ExtensionAPI, root: string, specs: NamedValidation[], signal?: AbortSignal): Promise<ExecResult[]> {
  const results: ExecResult[] = [];
  for (const spec of specs) {
    if (signal?.aborted) break;
    const started = Date.now();
    const timeout = Math.max(1_000, Math.min(MAX_TIMEOUT_MS, spec.timeoutMs ?? DEFAULT_TIMEOUT_MS));
    const result = await pi.exec("bash", ["-lc", spec.command], { cwd: root, timeout, signal });
    const raw = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    const truncated = truncateTail(raw || "(no output)", { maxLines: 120, maxBytes: 8_000 });
    results.push({ name: spec.name, command: spec.command, code: result.code, durationMs: Date.now() - started, output: truncated.content, truncated: truncated.truncated });
    if (result.code !== 0) break;
  }
  return results;
}

function formatValidation(results: ExecResult[]): string {
  if (results.length === 0) return "No validation command selected.";
  return bounded(results.map((result) => [
    `[${result.code === 0 ? "PASS" : "FAIL"}] ${result.name} · exit ${result.code} · ${result.durationMs}ms`,
    `$ ${result.command}`,
    result.output,
    result.truncated ? "[output bounded]" : "",
  ].filter(Boolean).join("\n")).join("\n\n"), TOOL_MAX_CHARS);
}

function applyExactEdits(source: string, edits: Array<{ oldText: string; newText: string }>): string {
  const located = edits.map((edit, index) => {
    if (!edit.oldText) throw new Error(`edits[${index}].oldText must not be empty`);
    const start = source.indexOf(edit.oldText);
    if (start < 0) throw new Error(`edits[${index}].oldText not found`);
    if (source.indexOf(edit.oldText, start + 1) >= 0) throw new Error(`edits[${index}].oldText is not unique`);
    return { ...edit, start, end: start + edit.oldText.length, index };
  }).sort((a, b) => a.start - b.start);
  for (let index = 1; index < located.length; index++) if (located[index]!.start < located[index - 1]!.end) throw new Error("Edit blocks overlap");
  let output = source;
  for (const edit of located.sort((a, b) => b.start - a.start)) output = `${output.slice(0, edit.start)}${edit.newText}${output.slice(edit.end)}`;
  return output;
}

export default function projectLoop(pi: ExtensionAPI): void {
  let preflight: string | undefined;

  pi.on("before_agent_start", async (event, ctx) => {
    preflight = await buildProjectPreflight(pi, ctx, event.prompt);
  });
  pi.on("context", (event) => {
    if (!preflight) return;
    const messages = event.messages.filter((message) => !(message.role === "custom" && (message as { customType?: string }).customType === "project-preflight"));
    let insertAt = -1;
    for (let index = messages.length - 1; index >= 0; index--) if (messages[index]?.role === "user") { insertAt = index + 1; break; }
    const message = { role: "custom" as const, customType: "project-preflight", content: `[auto-project-preflight]\n${preflight}`, display: false, timestamp: Date.now() };
    messages.splice(insertAt < 0 ? messages.length : insertAt, 0, message);
    return { messages };
  });
  pi.on("agent_settled", () => { preflight = undefined; });

  pi.registerTool({
    name: "project_context",
    label: "Project Context",
    description: "Retrieve bounded, ranked project context for a query. Returns profile excerpts, matching paths/content, stack and git summary; never dumps a full repository.",
    parameters: Type.Object({ query: Type.String(), maxFiles: Type.Optional(Type.Integer({ minimum: 1, maximum: 20 })) }),
    async execute(_id, params, signal, _update, ctx) {
      const root = findProjectRoot(ctx.cwd);
      const parsed = parseProfile(root, ctx.isProjectTrusted());
      const prelude = await buildProjectPreflight(pi, ctx, params.query);
      const matches = await searchExcerpts(pi, root, params.query, params.maxFiles ?? 8, signal);
      return { content: [{ type: "text", text: bounded(`${prelude}\n${matches}`, TOOL_MAX_CHARS) }], details: { root, profile: Boolean(parsed.profile) } };
    },
  });

  pi.registerTool({
    name: "project_probe",
    label: "Project Probe",
    description: "Run bounded compound project discovery: root, stack, git state, top-level map, profile validation targets and task-ranked paths/content.",
    parameters: Type.Object({ query: Type.Optional(Type.String()), maxFiles: Type.Optional(Type.Integer({ minimum: 1, maximum: 20 })) }),
    async execute(_id, params, signal, _update, ctx) {
      const root = findProjectRoot(ctx.cwd);
      const prelude = await buildProjectPreflight(pi, ctx, params.query ?? "");
      const matches = params.query ? await searchExcerpts(pi, root, params.query, params.maxFiles ?? 8, signal) : "";
      return { content: [{ type: "text", text: bounded([prelude, matches].filter(Boolean).join("\n"), TOOL_MAX_CHARS) }], details: { root } };
    },
  });

  pi.registerTool({
    name: "targeted_test",
    label: "Targeted Test",
    description: "Run one profile-first targeted validation workflow. Select profile target by name; without profile, run bounded local diff/syntax checks only. No network installs.",
    parameters: Type.Object({ target: Type.Optional(Type.String()), paths: Type.Optional(Type.Array(Type.String(), { maxItems: 30 })) }),
    async execute(_id, params, signal, _update, ctx) {
      const root = findProjectRoot(ctx.cwd);
      const parsed = parseProfile(root, ctx.isProjectTrusted());
      if (parsed.error && existsSync(join(root, PROFILE_PATH))) throw new Error(parsed.error);
      const selected = profileTarget(parsed.profile, params.target);
      if (params.target && !selected) throw new Error(`Unknown validation target: ${params.target}`);
      const status = await gitStatus(pi, root, signal);
      const paths = params.paths?.map((path) => relative(root, safeProjectPath(root, path))) ?? changedFilesFromStatus(status);
      const specs = selected ? [selected] : autodetectValidation(root, paths, false);
      const results = await runValidation(pi, root, specs, signal);
      return { content: [{ type: "text", text: formatValidation(results) }], details: { ok: results.length > 0 && results.every((item) => item.code === 0), source: selected?.source ?? "autodetect", results } };
    },
  });

  pi.registerTool({
    name: "edit_verify",
    label: "Edit Verify",
    description: "Apply unique non-overlapping exact replacements to one project file, then run profile-first targeted validation or bounded local syntax checks in same tool call.",
    executionMode: "sequential",
    parameters: Type.Object({
      path: Type.String(),
      edits: Type.Array(Type.Object({ oldText: Type.String(), newText: Type.String() }), { minItems: 1, maxItems: 20 }),
      validationTarget: Type.Optional(Type.String()),
    }),
    async execute(_id, params, signal, _update, ctx) {
      const root = findProjectRoot(ctx.cwd);
      const path = safeProjectPath(root, params.path);
      const parsed = parseProfile(root, ctx.isProjectTrusted());
      if (parsed.error && existsSync(join(root, PROFILE_PATH))) throw new Error(parsed.error);
      const selected = profileTarget(parsed.profile, params.validationTarget);
      if (params.validationTarget && !selected) throw new Error(`Unknown validation target: ${params.validationTarget}`);
      await withFileMutationQueue(path, async () => {
        const source = readFileSync(path, "utf8");
        writeFileSync(path, applyExactEdits(source, params.edits), "utf8");
      });
      const rel = relative(root, path);
      const specs = selected ? [selected] : autodetectValidation(root, [rel], false);
      const results = await runValidation(pi, root, specs, signal);
      const ok = results.length > 0 && results.every((item) => item.code === 0);
      return { content: [{ type: "text", text: bounded(`Updated ${rel} (${params.edits.length} edits).\n${formatValidation(results)}`, TOOL_MAX_CHARS) }], details: { path: rel, edits: params.edits.length, ok, source: selected?.source ?? "autodetect", results } };
    },
  });

  pi.registerTool({
    name: "finish_gate",
    label: "Finish Gate",
    description: "Run project profile finish commands in order. Without profile, run bounded git diff and local syntax/type checks for changed files. Stops at first failure.",
    executionMode: "sequential",
    parameters: Type.Object({}),
    async execute(_id, _params, signal, _update, ctx) {
      const root = findProjectRoot(ctx.cwd);
      const parsed = parseProfile(root, ctx.isProjectTrusted());
      if (parsed.error && existsSync(join(root, PROFILE_PATH))) throw new Error(parsed.error);
      const configured = profileFinish(parsed.profile);
      const status = await gitStatus(pi, root, signal);
      const specs = configured.length ? configured : autodetectValidation(root, changedFilesFromStatus(status), true);
      const results = await runValidation(pi, root, specs, signal);
      return { content: [{ type: "text", text: formatValidation(results) }], details: { ok: results.length > 0 && results.every((item) => item.code === 0), source: configured.length ? "profile" : "autodetect", results } };
    },
  });

  pi.registerCommand("fast-fix", {
    description: "Start low-round-trip fix workflow: /fast-fix <task>",
    handler: async (args, ctx) => {
      const task = args.trim();
      if (!task) { ctx.ui.notify("Usage: /fast-fix <task>", "warning"); return; }
      const wanted = ["project_probe", "project_context", "edit_verify", "targeted_test", "finish_gate"];
      pi.setActiveTools([...new Set([...pi.getActiveTools(), ...wanted])]);
      pi.sendUserMessage(`Fast-fix task: ${task}\nUse bounded project_probe once, prefer edit_verify over separate edit+test calls, use targeted_test only when needed, then run finish_gate. Batch independent discovery. Minimize model round-trips; do not skip required validation.`);
    },
  });
}
