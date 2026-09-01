import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, rename, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MAX_TEXT_CHARS = 200_000;
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const WIDTH = 84;

type LooseMessage = {
  role?: string;
  content?: string | Array<Record<string, unknown>>;
};

type SafeImage = {
  data: Buffer;
  extension: "png" | "jpg" | "webp";
  hash: string;
};

type ReaderBackend = "wsl-windows-terminal" | "tmux";

type RuntimePaths = {
  backend: ReaderBackend;
  directory: string;
  documentLinux: string;
  heartbeatLinux: string;
  stopLinux: string;
  watcherLinux: string;
  documentWindows?: string;
  heartbeatWindows?: string;
  stopWindows?: string;
  watcherWindows?: string;
  mdcatWindows?: string;
  tmuxPaneId?: string;
};

export function selectReaderBackend(env: NodeJS.ProcessEnv = process.env): ReaderBackend | undefined {
  if (env.WSL_DISTRO_NAME) return "wsl-windows-terminal";
  if (env.TMUX && env.TMUX_PANE) return "tmux";
  return undefined;
}

function stripControlCharacters(value: string): string {
  return value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, "");
}

export function sanitizeMarkdown(value: string): string {
  const clean = stripControlCharacters(value).slice(0, MAX_TEXT_CHARS);
  let fence: string | undefined;
  return clean
    .split("\n")
    .map((line) => {
      const marker = line.trimStart().match(/^(```+|~~~+)/)?.[1];
      if (marker) {
        if (!fence) fence = marker[0];
        else if (marker[0] === fence) fence = undefined;
        return line;
      }
      if (fence) return line;
      return line
        .replace(/!\[/g, "[image blocked] [")
        .replace(/<img\b[^>]*>/gi, "[image blocked by safe reader]");
    })
    .join("\n");
}

function splitMarkdownTableRow(line: string): string[] | undefined {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return undefined;
  const cells: string[] = [];
  let cell = "";
  let escaped = false;
  let codeTicks = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    const character = trimmed[index];
    if (escaped) {
      cell += character;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      cell += character;
      escaped = true;
      continue;
    }
    if (character === "`") {
      let end = index;
      while (trimmed[end + 1] === "`") end += 1;
      const run = end - index + 1;
      if (codeTicks === 0) codeTicks = run;
      else if (codeTicks === run) codeTicks = 0;
      cell += trimmed.slice(index, end + 1);
      index = end;
      continue;
    }
    if (character === "|" && codeTicks === 0) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }
    cell += character;
  }
  cells.push(cell.trim());
  if (trimmed.startsWith("|")) cells.shift();
  if (trimmed.endsWith("|") && !trimmed.endsWith("\\|")) cells.pop();
  return cells.length > 0 ? cells : undefined;
}

function isTableSeparator(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")));
}

function markdownDisplayLength(value: string): number {
  const plain = value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[*_~`]/g, "");
  return Array.from(plain).length;
}

function estimatedTableWidth(rows: string[][], columnCount: number): number {
  const widths = Array.from({ length: columnCount }, () => 0);
  for (const row of rows) {
    for (let index = 0; index < columnCount; index += 1) {
      widths[index] = Math.max(widths[index], markdownDisplayLength(row[index] ?? ""));
    }
  }
  return widths.reduce((sum, width) => sum + width, 0) + columnCount * 3 + 1;
}

function tableCards(headers: string[], rows: string[][]): string[] {
  const output = ["> Широкая таблица показана карточками для боковой панели.", ""];
  rows.forEach((row, rowIndex) => {
    if (rowIndex > 0) output.push("---", "");
    const title = row[0]?.trim() || `Строка ${rowIndex + 1}`;
    output.push(`### ${rowIndex + 1}. ${title}`, "");
    for (let column = 1; column < headers.length; column += 1) {
      output.push(`**${headers[column] || `Столбец ${column + 1}`}**`, "", row[column]?.trim() || "—", "");
    }
  });
  return output;
}

export function adaptWideTables(value: string, width = WIDTH): string {
  const lines = value.split("\n");
  const output: string[] = [];
  let fence: string | undefined;
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    const marker = line.trimStart().match(/^(```+|~~~+)/)?.[1];
    if (marker) {
      if (!fence) fence = marker[0];
      else if (marker[0] === fence) fence = undefined;
      output.push(line);
      index += 1;
      continue;
    }
    if (fence || index + 1 >= lines.length) {
      output.push(line);
      index += 1;
      continue;
    }
    const headers = splitMarkdownTableRow(line);
    const separator = splitMarkdownTableRow(lines[index + 1]);
    if (!headers || !separator || separator.length !== headers.length || !isTableSeparator(separator)) {
      output.push(line);
      index += 1;
      continue;
    }
    const rows: string[][] = [];
    let end = index + 2;
    while (end < lines.length) {
      const row = splitMarkdownTableRow(lines[end]);
      if (!row || row.length !== headers.length) break;
      rows.push(row);
      end += 1;
    }
    if (rows.length === 0 || estimatedTableWidth([headers, ...rows], headers.length) <= width) {
      output.push(...lines.slice(index, end));
    } else {
      output.push(...tableCards(headers, rows));
    }
    index = end;
  }
  return output.join("\n");
}

function messageText(message: LooseMessage): string {
  if (typeof message.content === "string") return message.content;
  if (!Array.isArray(message.content)) return "";
  return message.content
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => String(part.text))
    .join("\n\n");
}

export function selectLatestAssistantText(messages: LooseMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "assistant") continue;
    const text = messageText(message).trim();
    if (text) return sanitizeMarkdown(text);
  }
  return "";
}

function imageExtension(mimeType: string, data: Buffer): SafeImage["extension"] | undefined {
  if (mimeType === "image/png" && data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (mimeType === "image/jpeg" && data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpg";
  if (mimeType === "image/webp" && data.length >= 12 && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return undefined;
}

export function collectSafeImages(messages: LooseMessage[]): SafeImage[] {
  const result = new Map<string, SafeImage>();
  for (const message of messages) {
    if (message?.role !== "toolResult" || !Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (part?.type !== "image" || typeof part.data !== "string" || typeof part.mimeType !== "string") continue;
      let data: Buffer;
      try {
        data = Buffer.from(part.data, "base64");
      } catch {
        continue;
      }
      if (data.length === 0 || data.length > MAX_IMAGE_BYTES) continue;
      const extension = imageExtension(part.mimeType, data);
      if (!extension) continue;
      const hash = createHash("sha256").update(data).digest("hex");
      if (!result.has(hash)) result.set(hash, { data, extension, hash });
      if (result.size >= MAX_IMAGES) return [...result.values()];
    }
  }
  return [...result.values()];
}

export function buildDocument(text: string, imageNames: string[], updatedAt = new Date()): string {
  const lines = [
    "# Last Pi response",
    "",
    `> Updated ${updatedAt.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC")}`,
    "",
    adaptWideTables(text, WIDTH) || "_No completed assistant response yet._",
  ];
  if (imageNames.length > 0) {
    lines.push("", "## Images", "");
    imageNames.forEach((name, index) => lines.push(`![Pi output ${index + 1}](./${name})`, ""));
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

const WATCHER_SCRIPT = String.raw`param(
  [Parameter(Mandatory=$true)][string]$Mdcat,
  [Parameter(Mandatory=$true)][string]$Document,
  [Parameter(Mandatory=$true)][string]$Heartbeat,
  [Parameter(Mandatory=$true)][string]$StopFile
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$lastStamp = ''
while (-not (Test-Path -LiteralPath $StopFile)) {
  if (Test-Path -LiteralPath $Heartbeat) {
    $age = ((Get-Date) - (Get-Item -LiteralPath $Heartbeat).LastWriteTime).TotalSeconds
    if ($age -gt 20) { break }
  }
  if (Test-Path -LiteralPath $Document) {
    $stamp = (Get-Item -LiteralPath $Document).LastWriteTimeUtc.Ticks.ToString()
    if ($stamp -ne $lastStamp) {
      $lastStamp = $stamp
      Clear-Host
      & $Mdcat --columns 84 --theme catppuccin $Document
      Write-Host ''
      Write-Host 'Auto-updates after each completed Pi response. Ctrl+C closes reader.' -ForegroundColor DarkGray
    }
  }
  Start-Sleep -Milliseconds 500
}
Write-Host 'Reader pane stopped.' -ForegroundColor DarkGray
`;

const TMUX_WATCHER_SCRIPT = String.raw`import { readFileSync, statSync } from "node:fs";

const [document, heartbeat, stopFile] = process.argv.slice(2);
const esc = "\u001b[";
const style = (code, text) => esc + code + "m" + text + esc + "0m";
const inline = (line) => line
  .replace(/\x60([^\x60]+)\x60/g, (_, value) => style("38;5;215", value))
  .replace(/\*\*([^*]+)\*\*/g, (_, value) => style("1", value))
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => style("4;36", label) + style("2", " (" + url + ")"));
function render(markdown) {
  let fenced = false;
  return markdown.split("\n").map((raw) => {
    if (/^\s*(?:\x60{3}|~{3})/.test(raw)) { fenced = !fenced; return style("2", "─".repeat(Math.max(12, process.stdout.columns || 72))); }
    if (fenced) return style("38;5;114", "  " + raw);
    const heading = raw.match(/^(#{1,6})\s+(.*)$/);
    if (heading) return style(heading[1].length < 3 ? "1;38;5;81" : "1;38;5;117", heading[2]);
    if (/^\s*---+\s*$/.test(raw)) return style("2", "─".repeat(Math.max(12, process.stdout.columns || 72)));
    if (/^>/.test(raw)) return style("3;38;5;244", "│ " + inline(raw.replace(/^>\s?/, "")));
    if (/^\s*[-*+]\s+/.test(raw)) return inline(raw.replace(/^(\s*)[-*+]\s+/, "$1• "));
    return inline(raw);
  }).join("\n");
}
let stamp = 0;
const redraw = () => {
  try {
    const next = statSync(document).mtimeMs;
    if (next === stamp) return;
    stamp = next;
    process.stdout.write(esc + "2J" + esc + "H" + render(readFileSync(document, "utf8")));
    process.stdout.write("\n\n" + style("2", "Auto-updates after each completed Pi response. /reader-pane-off closes reader.") + "\n");
  } catch {}
};
const timer = setInterval(() => {
  try { if (statSync(stopFile).isFile() || Date.now() - statSync(heartbeat).mtimeMs > 20000) process.exit(0); } catch {}
  redraw();
}, 500);
process.on("SIGTERM", () => process.exit(0));
redraw();
`;

async function toWindowsPath(pi: ExtensionAPI, path: string): Promise<string> {
  const result = await pi.exec("wslpath", ["-w", path], { timeout: 5_000 });
  if (result.code !== 0 || !result.stdout.trim()) throw new Error(result.stderr.trim() || `wslpath failed for ${path}`);
  return result.stdout.trim().replace(/\r/g, "");
}

async function locateMdcat(pi: ExtensionAPI): Promise<string> {
  const profile = await pi.exec(
    "powershell.exe",
    ["-NoLogo", "-NoProfile", "-Command", "[Environment]::GetFolderPath('UserProfile')"],
    { timeout: 5_000 },
  );
  if (profile.code !== 0 || !profile.stdout.trim()) throw new Error("Cannot determine Windows user profile");
  const windowsProfile = profile.stdout.trim().replace(/\r/g, "");
  const linuxProfileResult = await pi.exec("wslpath", ["-u", windowsProfile], { timeout: 5_000 });
  if (linuxProfileResult.code !== 0) throw new Error("Cannot map Windows user profile into WSL");
  const linuxShim = join(linuxProfileResult.stdout.trim().replace(/\r/g, ""), "scoop", "shims", "mdcat.exe");
  await access(linuxShim, fsConstants.X_OK);
  return `${windowsProfile}\\scoop\\shims\\mdcat.exe`;
}

async function createRuntime(pi: ExtensionAPI, backend: ReaderBackend): Promise<RuntimePaths> {
  const directory = await mkdtemp(join(tmpdir(), "pi-reader-pane-"));
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const documentLinux = join(directory, "last-response.md");
  const heartbeatLinux = join(directory, "heartbeat");
  const stopLinux = join(directory, "stop");
  const watcherLinux = join(directory, backend === "tmux" ? "watch-reader.mjs" : "watch-reader.ps1");
  if (backend === "tmux") {
    await writeFile(watcherLinux, TMUX_WATCHER_SCRIPT, { encoding: "utf8", mode: 0o600 });
    return { backend, directory, documentLinux, heartbeatLinux, stopLinux, watcherLinux };
  }
  const mdcatWindows = await locateMdcat(pi);
  await writeFile(watcherLinux, WATCHER_SCRIPT, { encoding: "utf8", mode: 0o600 });
  return {
    backend, directory, documentLinux, heartbeatLinux, stopLinux, watcherLinux, mdcatWindows,
    documentWindows: await toWindowsPath(pi, documentLinux),
    heartbeatWindows: await toWindowsPath(pi, heartbeatLinux),
    stopWindows: await toWindowsPath(pi, stopLinux),
    watcherWindows: await toWindowsPath(pi, watcherLinux),
  };
}

export default function readerPaneExtension(pi: ExtensionAPI): void {
  let enabled = false;
  let runtime: RuntimePaths | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let latestText = "";
  const pendingImages = new Map<string, SafeImage>();

  const setStatus = (ctx: any, value?: string) => ctx.ui.setStatus("reader-pane", value);

  const writePreview = async (): Promise<void> => {
    if (!enabled || !runtime) return;
    const imageNames: string[] = [];
    let index = 0;
    for (const image of pendingImages.values()) {
      index += 1;
      const name = `image-${index}-${image.hash.slice(0, 10)}.${image.extension}`;
      await writeFile(join(runtime.directory, name), image.data, { mode: 0o600 });
      imageNames.push(name);
    }
    const temporary = `${runtime.documentLinux}.tmp`;
    await writeFile(temporary, buildDocument(latestText, imageNames), { encoding: "utf8", mode: 0o600 });
    await rename(temporary, runtime.documentLinux);
  };

  const stop = async (ctx?: any): Promise<void> => {
    enabled = false;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
    if (runtime) await writeFile(runtime.stopLinux, "stop\n", { encoding: "ascii", mode: 0o600 }).catch(() => {});
    runtime = undefined;
    if (ctx) setStatus(ctx, undefined);
  };

  const start = async (ctx: any): Promise<void> => {
    if (enabled) {
      ctx.ui.notify("Reader pane is already enabled", "info");
      return;
    }
    const backend = selectReaderBackend();
    if (!backend) {
      ctx.ui.notify("Reader pane requires WSL + Windows Terminal or a tmux session", "error");
      return;
    }
    try {
      runtime = await createRuntime(pi, backend);
      enabled = true;
      const entries = ctx.sessionManager.getBranch();
      latestText = selectLatestAssistantText(
        entries.filter((entry: any) => entry?.type === "message").map((entry: any) => entry.message),
      );
      await writePreview();
      await writeFile(runtime.heartbeatLinux, "alive\n", { encoding: "ascii", mode: 0o600 });
      heartbeatTimer = setInterval(() => {
        if (runtime) writeFile(runtime.heartbeatLinux, `${Date.now()}\n`, { encoding: "ascii", mode: 0o600 }).catch(() => {});
      }, 3_000);
      heartbeatTimer.unref?.();

      if (runtime.backend === "tmux") {
        const launched = await pi.exec("tmux", [
          "split-window", "-h", "-l", "45%", "-d", "-P", "-F", "#{pane_id}",
          "-t", process.env.TMUX_PANE!,
          process.execPath, runtime.watcherLinux, runtime.documentLinux, runtime.heartbeatLinux, runtime.stopLinux,
        ], { timeout: 10_000 });
        if (launched.code !== 0) throw new Error(launched.stderr.trim() || `tmux exited ${launched.code}`);
        runtime.tmuxPaneId = launched.stdout.trim();
      } else {
        const targetWindow = process.env.WT_SESSION?.trim() || "0";
        const args = [
          "-w", targetWindow,
          "split-pane", "-V", "--size", "0.45", "--title", "Pi-reader",
          "powershell.exe", "-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", runtime.watcherWindows!,
          "-Mdcat", runtime.mdcatWindows!,
          "-Document", runtime.documentWindows!,
          "-Heartbeat", runtime.heartbeatWindows!,
          "-StopFile", runtime.stopWindows!,
        ];
        const launched = await pi.exec("wt.exe", args, { timeout: 10_000 });
        if (launched.code !== 0) throw new Error(launched.stderr.trim() || `wt.exe exited ${launched.code}`);
      }
      setStatus(ctx, `reader:${runtime.backend === "tmux" ? "tmux" : "wt"}`);
      ctx.ui.notify("Reader pane enabled. Use /reader-pane-off to stop it", "info");
    } catch (error) {
      await stop(ctx);
      const message = error instanceof Error ? error.message : String(error);
      ctx.ui.notify(`Reader pane was not started: ${message}`, "error");
    }
  };

  pi.on("message_end", (event) => {
    if (event.message.role === "user") {
      latestText = "";
      pendingImages.clear();
    }
  });

  pi.on("agent_end", (event) => {
    if (!enabled) return;
    const text = selectLatestAssistantText(event.messages as LooseMessage[]);
    if (text) latestText = text;
    for (const image of collectSafeImages(event.messages as LooseMessage[])) pendingImages.set(image.hash, image);
  });

  pi.on("agent_settled", async (_event, ctx) => {
    if (!enabled || !latestText) return;
    try {
      await writePreview();
    } catch (error) {
      ctx.ui.notify(`Reader pane update failed: ${error instanceof Error ? error.message : String(error)}`, "warning");
    }
  });

  pi.on("session_shutdown", async () => {
    await stop();
  });

  pi.registerCommand("reader-pane-on", {
    description: "Open safe auto-updating mdcat reader in a right Windows Terminal pane",
    handler: async (_args, ctx) => start(ctx),
  });

  pi.registerCommand("reader-pane-off", {
    description: "Stop the mdcat reader pane",
    handler: async (_args, ctx) => {
      if (!enabled) {
        ctx.ui.notify("Reader pane is already disabled", "info");
        return;
      }
      await stop(ctx);
      ctx.ui.notify("Reader pane disabled", "info");
    },
  });

  pi.registerCommand("reader-pane-status", {
    description: "Show reader pane status",
    handler: async (_args, ctx) => {
      ctx.ui.notify(enabled ? `Reader pane enabled (${runtime?.directory})` : "Reader pane disabled", "info");
    },
  });
}
