#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sourceRoot = resolve(process.argv[2] ?? new URL("..", import.meta.url).pathname);
const root = mkdtempSync(join(tmpdir(), "pi-decision-observer-test-"));
const agentRoot = join(root, "agent");
const projectRoot = join(root, "private-project");
const configPath = join(projectRoot, ".pi", "decision-observability.json");
const ledgerPath = join(agentRoot, "decision-ledger.jsonl");
const loopRunsPath = join(agentRoot, "loop-runs.jsonl");
const sandbox = join(root, "module");

const config = {
  enabled: true,
  mode: "structured-markers",
  maxRecords: 500,
  retentionDays: 90,
  maxTextChars: 500,
  capturePaths: false,
  captureCommits: true,
  captureToolOutput: false,
  captureMessages: false,
  capturePrompts: false,
};

function writeConfig(value = config) {
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(value, null, 2)}\n`);
}

function ledger() {
  if (!existsSync(ledgerPath)) return [];
  return readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function makeHarness(observer, mode = "rpc") {
  const handlers = new Map();
  const commands = new Map();
  const notifications = [];
  const statuses = [];
  let toolRegistrations = 0;
  let dashboardLines = [];
  const theme = {
    fg(_color, text) { return text; },
    bg(_color, text) { return text; },
    bold(text) { return text; },
  };
  const ctx = {
    cwd: projectRoot,
    mode,
    model: { provider: "test", id: "test-model" },
    thinkingLevel: "medium",
    sessionManager: {
      getSessionId() { return "private-session-id"; },
      getSessionFile() { return join(projectRoot, "private-session.jsonl"); },
    },
    isProjectTrusted() { return true; },
    ui: {
      notify(message, type) { notifications.push({ message, type }); },
      setStatus(id, text) { statuses.push({ id, text }); },
      async custom(factory) {
        let rendered;
        const component = factory({ requestRender() { rendered = component.render(120); } }, theme, {}, () => undefined);
        rendered = component.render(120);
        dashboardLines = rendered;
      },
    },
  };
  const pi = {
    on(name, handler) {
      const list = handlers.get(name) ?? [];
      list.push(handler);
      handlers.set(name, list);
    },
    registerCommand(name, options) { commands.set(name, options); },
    registerTool() { toolRegistrations += 1; },
  };
  observer(pi);
  const emit = async (name, event = {}) => {
    for (const handler of handlers.get(name) ?? []) await handler(event, ctx);
  };
  return { handlers, commands, notifications, statuses, ctx, emit, get toolRegistrations() { return toolRegistrations; }, get dashboardLines() { return dashboardLines; } };
}

try {
  writeConfig();
  mkdirSync(join(sandbox, "local-extensions"), { recursive: true });
  cpSync(join(sourceRoot, "local-extensions", "decision-observer.ts"), join(sandbox, "local-extensions", "decision-observer.ts"));
  const shimRoot = join(sandbox, "node_modules", "@earendil-works", "pi-tui");
  mkdirSync(shimRoot, { recursive: true });
  writeFileSync(join(shimRoot, "package.json"), JSON.stringify({ name: "@earendil-works/pi-tui", type: "module", exports: "./index.js" }));
  writeFileSync(join(shimRoot, "index.js"), `
export const Key = { escape: "ESC", enter: "ENTER", backspace: "BACKSPACE", up: "UP", down: "DOWN", pageUp: "PAGEUP", pageDown: "PAGEDOWN" };
export const matchesKey = (data, key) => data === key;
export const visibleWidth = (value) => String(value).replace(/\\x1b\\[[0-9;]*m/g, "").length;
export const truncateToWidth = (value, width, suffix = "…") => {
  const text = String(value);
  if (text.length <= width) return text;
  if (width <= suffix.length) return suffix.slice(0, width);
  return text.slice(0, width - suffix.length) + suffix;
};
`);

  process.env.PI_CODING_AGENT_DIR = agentRoot;
  process.env.PI_DECISION_CONFIG = configPath;
  process.env.PI_DECISION_LEDGER_OUT = ledgerPath;
  process.env.PI_LOOP_RUNS_OUT = loopRunsPath;

  const moduleUrl = `${pathToFileURL(join(sandbox, "local-extensions", "decision-observer.ts")).href}?test=${Date.now()}`;
  const module = await import(moduleUrl);
  const { default: observer, DecisionDashboard, parseDecisionMarkers, applyDecisionMarkers, formatDecisionReport } = module;

  assert.deepEqual(parseDecisionMarkers("ordinary text\n[DECISION] runtime: Keep QuickJS"), [
    { type: "DECISION", key: "runtime", payload: "Keep QuickJS" },
  ]);
  assert.equal(parseDecisionMarkers(`[DECISION] huge: ${"x".repeat(501)}`).length, 0, "oversized marker must be rejected");
  assert.equal(parseDecisionMarkers("[DECISION]\n[OTHER] ignored").length, 0, "malformed/unknown markers must be rejected");

  const harness = makeHarness(observer);
  assert.deepEqual([...harness.commands.keys()].sort(), ["decision-report", "decision-show", "decisions"]);
  assert.equal(harness.toolRegistrations, 0, "observer must not register model-facing tools");
  for (const contentEvent of ["input", "context", "before_provider_request", "tool_execution_end", "message_update"]) {
    assert.equal(harness.handlers.has(contentEvent), false, `observer must not subscribe to ${contentEvent}`);
  }

  await harness.emit("session_start", { type: "session_start", reason: "startup" });
  await harness.emit("before_agent_start", { type: "before_agent_start", prompt: "RAW_PRIVATE_PROMPT" });
  const timestamp = Date.now();
  const secret = "sk-" + "THISSECRET123456";
  const privatePath = "/mnt/private/company/repository/file.ts";
  await harness.emit("message_end", {
    type: "message_end",
    message: {
      role: "assistant",
      timestamp,
      content: [
        { type: "thinking", thinking: `[DECISION] hidden: ${secret}` },
        { type: "text", text: `ordinary RAW_PRIVATE_MESSAGE ${secret}\n[DECISION] runtime: Keep QuickJS at ${privatePath}; secret=${secret}\n[VALIDATION] runtime: RPC PASS, errors=0, commit bc5d975\n[DECISION] huge: ${"z".repeat(501)}` },
      ],
    },
  });

  let values = ledger();
  assert.equal(values.length, 1);
  assert.equal(values[0].key, "runtime");
  assert.equal(values[0].status, "validated");
  assert.equal(values[0].commit, "bc5d975");
  assert.match(values[0].decision, /<redacted-secret>/);
  assert.match(values[0].decision, /<path>/);
  let serialized = readFileSync(ledgerPath, "utf8");
  for (const forbidden of [secret, privatePath, "RAW_PRIVATE_PROMPT", "RAW_PRIVATE_MESSAGE", "hidden"]) assert.equal(serialized.includes(forbidden), false, `ledger leaked ${forbidden}`);
  assert.equal(statSync(ledgerPath).mode & 0o777, 0o600);
  assert.equal(statSync(dirname(ledgerPath)).mode & 0o777, 0o700);

  writeFileSync(`${ledgerPath}.lock`, "2147483647\n", { mode: 0o600 });
  await harness.emit("message_end", {
    type: "message_end",
    message: { role: "assistant", timestamp: timestamp + 1, content: [{ type: "text", text: "[DECISION] release: Publish only after gates\n[VALIDATION] release: test FAIL, errors=2" }] },
  });
  assert.equal(existsSync(`${ledgerPath}.lock`), false, "stale crash lock must be recovered");
  await harness.emit("message_end", {
    type: "message_end",
    message: { role: "assistant", timestamp: timestamp + 2, content: [{ type: "text", text: "[DECISION] old-path: Use node-process\n[SUPERSEDED] old-path: Use node-process" }] },
  });
  await harness.emit("message_end", {
    type: "message_end",
    message: { role: "assistant", timestamp: timestamp + 3, content: [{ type: "text", text: "[DECISION] review: Keep result pending\n[VALIDATION] review: inspected manually" }] },
  });
  await harness.emit("message_end", {
    type: "message_end",
    message: { role: "assistant", timestamp: timestamp + 4, content: [{ type: "text", text: "[DECISION] migration: Install candidate\n[VALIDATION] migration: rollback PASS" }] },
  });
  values = ledger();
  assert.equal(values.find((record) => record.key === "release").status, "failed");
  assert.equal(values.find((record) => record.key === "old-path").status, "superseded");
  assert.equal(values.find((record) => record.key === "review").status, "unknown");
  assert.equal(values.find((record) => record.key === "migration").status, "reverted");

  const pHash = createHash("sha256").update(resolve(projectRoot)).digest("hex").slice(0, 12);
  const sHash = createHash("sha256").update("private-session-id").digest("hex").slice(0, 16);
  writeFileSync(loopRunsPath, `${JSON.stringify({ version: 1, timestamp: new Date(timestamp - 100).toISOString(), projectHash: pHash, sessionHash: sHash, runId: "run-1", durationMs: 1234, modelCalls: 1, toolCalls: 2, validationRounds: 1, toolErrors: 0 })}\n`);
  const lastReport = formatDecisionReport(values.filter((record) => record.key === "runtime"), "last", [JSON.parse(readFileSync(loopRunsPath, "utf8"))]);
  assert.match(lastReport, /Run: model 1 · tools 2/);

  assert.equal(existsSync(join(projectRoot, ".pi", "reports")), false, "export must be explicit");
  await harness.commands.get("decision-show").handler("runtime", harness.ctx);
  assert.match(harness.notifications.at(-1).message, /Keep QuickJS/);
  await harness.commands.get("decision-report").handler("30d", harness.ctx);
  assert.match(harness.notifications.at(-1).message, /validation coverage/);
  await harness.commands.get("decisions").handler("", harness.ctx);
  assert.match(harness.notifications.at(-1).message, /Decision report/);
  await harness.commands.get("decision-report").handler("30d --markdown", harness.ctx);
  assert.match(harness.notifications.at(-1).message, /^exported \.pi[\\/]reports/);
  assert.equal(existsSync(join(projectRoot, ".pi", "reports", `decisions-${new Date().toISOString().slice(0, 10)}.md`)), true);

  const theme = { fg(_color, text) { return text; }, bg(_color, text) { return text; }, bold(text) { return text; } };
  let renders = 0;
  let closed = 0;
  let exports = 0;
  const dashboard = new DecisionDashboard(values, [], theme, () => { renders += 1; }, () => { closed += 1; }, () => values, () => { exports += 1; return "exported"; });
  for (const width of [60, 120]) {
    const lines = dashboard.render(width);
    assert.ok(lines.length > 4);
    assert.ok(lines.every((line) => line.length <= width), `dashboard exceeded width ${width}`);
  }
  dashboard.handleInput("/");
  dashboard.handleInput("runtime");
  dashboard.handleInput("ENTER");
  assert.match(dashboard.render(80).join("\n"), /runtime/i);
  dashboard.handleInput("e");
  dashboard.handleInput("ESC");
  assert.ok(renders >= 5);
  assert.equal(exports, 1);
  assert.equal(closed, 1);

  const tuiHarness = makeHarness(observer, "tui");
  await tuiHarness.emit("session_start", { type: "session_start", reason: "resume" });
  assert.match(tuiHarness.statuses.at(-1).text, /^D ✓/);
  await tuiHarness.commands.get("decisions").handler("", tuiHarness.ctx);
  assert.ok(tuiHarness.dashboardLines.some((line) => line.includes("Decision Observatory")));

  appendFileSync(ledgerPath, `${JSON.stringify({ ...values[0], id: "expired-test", key: "expired-test", createdAt: "2000-01-01T00:00:00.000Z", updatedAt: "2000-01-01T00:00:00.000Z" })}\n`);
  const secondHarness = makeHarness(observer);
  await secondHarness.emit("session_start", { type: "session_start", reason: "resume" });
  assert.equal(readFileSync(ledgerPath, "utf8").includes("expired-test"), false, "session start must prune expired records");
  await secondHarness.commands.get("decision-show").handler("runtime", secondHarness.ctx);
  assert.match(secondHarness.notifications.at(-1).message, /validated/, "restart/resume must read persistent ledger");

  appendFileSync(ledgerPath, "{broken-json\n");
  await harness.emit("message_end", {
    type: "message_end",
    message: { role: "assistant", timestamp: timestamp + 5, content: [{ type: "text", text: `[DECISION] bulk-000: item 000\n${Array.from({ length: 505 }, (_, index) => `[DECISION] bulk-${String(index + 1).padStart(3, "0")}: item ${index + 1}`).join("\n")}` }] },
  });
  values = ledger();
  assert.equal(values.length, 500, "retention must cap records");
  assert.ok(values.every((record) => record.version === 1), "malformed lines must be skipped and compacted");

  const beforeDisabled = readFileSync(ledgerPath, "utf8");
  writeConfig({ ...config, enabled: false });
  await harness.emit("session_tree", { type: "session_tree" });
  await harness.emit("message_end", {
    type: "message_end",
    message: { role: "assistant", timestamp: timestamp + 6, content: [{ type: "text", text: "[DECISION] disabled: must not persist" }] },
  });
  assert.equal(readFileSync(ledgerPath, "utf8"), beforeDisabled, "disabled policy must not write");

  const pure = [];
  applyDecisionMarkers(pure, [{ type: "DECISION", key: "x", payload: "Choice" }, { type: "VALIDATION", key: "x", payload: "PASS errors=0" }], {
    projectHash: "project", sessionHash: "session", runSequence: 1, timestamp: new Date().toISOString(), captureCommits: true,
  });
  assert.equal(pure[0].status, "validated");
  assert.match(formatDecisionReport(pure, "all"), /✓ 1 validated/);

  console.log("PASS decision observer markers, privacy, transitions, correlation, retention/pruning, crash-lock recovery, restart, commands, export, footer, and TUI");
} finally {
  rmSync(root, { recursive: true, force: true });
}
