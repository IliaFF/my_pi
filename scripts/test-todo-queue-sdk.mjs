#!/usr/bin/env node
// Actual queue tool execution via Pi SDK; temporary TODO and faux provider only.
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { findPackageJSON, syncBuiltinESMExports } from "node:module";
import fs from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const modules = resolve(process.argv[2]);
const extension = resolve(process.argv[3] || join(dirname(fileURLToPath(import.meta.url)), "../local-extensions/todo-queue/index.ts"));
const sdkDir = join(modules, "@earendil-works/pi-coding-agent");
const root = mkdtempSync(join(tmpdir(), "pi-queue-sdk-"));
const previous = process.env.PI_CODING_AGENT_DIR;
process.env.PI_CODING_AGENT_DIR = join(root, "agent");
mkdirSync(process.env.PI_CODING_AGENT_DIR);
let session;
const originalWatchFile = fs.watchFile;
const originalUnwatchFile = fs.unwatchFile;
try {
  const { createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager } = await import(pathToFileURL(join(sdkDir, "dist/index.js")));
  const aiDir = dirname(findPackageJSON("@earendil-works/pi-ai", pathToFileURL(join(sdkDir, "dist/index.js"))));
  const { fauxProvider, fauxAssistantMessage, InMemoryCredentialStore } = await import(pathToFileURL(join(aiDir, "dist/index.js")));
  const provider = fauxProvider({ provider: "queue-offline-test", api: "faux", models: [{
    id: "faux", name: "Queue test", reasoning: false, input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 64000, maxTokens: 512,
  }] });
  const modelRuntime = await ModelRuntime.create({ credentials: new InMemoryCredentialStore(), modelsPath: null, refreshOnCreate: false });
  modelRuntime.registerNativeProvider(provider.provider);
  const settingsManager = SettingsManager.inMemory({ packages: [], compaction: { enabled: false }, retry: { enabled: false } });
  const resourceLoader = new DefaultResourceLoader({ cwd: root, agentDir: process.env.PI_CODING_AGENT_DIR, settingsManager,
    noSkills: true, noPromptTemplates: true, noThemes: true, additionalExtensionPaths: [extension] });
  await resourceLoader.reload();
  assert.deepEqual(resourceLoader.getExtensions().errors, []);
  ({ session } = await createAgentSession({ cwd: root, agentDir: process.env.PI_CODING_AGENT_DIR, modelRuntime,
    model: provider.getModel(), thinkingLevel: "off", resourceLoader, settingsManager, sessionManager: SessionManager.inMemory(root), tools: ["task_queue"] }));
  const errors = [];
  const notifications = [];
  await session.bindExtensions({ onError: error => errors.push(error), uiContext: {
    notify: (text, level) => notifications.push({ text, level }),
  } });
  const template = "# TODO\n\n## In progress\n\n## Pending\n- [ ] First <!-- pi-task:first -->\n- [ ] Second <!-- pi-task:second -->\n\n## Blocked\n- [ ] Blocked <!-- pi-task:blocked -->\n\n## Completed\n- [x] Done <!-- pi-task:done -->\n";
  const todo = join(root, "TODO.md");
  const results = [];
  session.subscribe(event => { if (event.type === "tool_execution_end") results.push(event); });
  async function invoke(args) {
    results.length = 0;
    provider.setResponses([{ ...fauxAssistantMessage(""), content: [{ type: "toolCall", id: "queue-call", name: "task_queue", arguments: args }], stopReason: "toolUse" }, fauxAssistantMessage("Finished")]);
    await session.prompt("Execute this queue check");
    await session.waitForIdle();
    assert.equal(session.getLastAssistantText(), "Finished");
    assert.equal(results.length, 1);
    return results[0];
  }
  const mixed = template.replace("## In progress\n\n", "## In progress\n- [ ] Current <!-- pi-task:current -->\n\n");
  const historyOnly = "# TODO\n\n## Completed\n- [x] Done <!-- pi-task:done -->\n";
  for (const fixture of [mixed, historyOnly]) {
    writeFileSync(todo, fixture);
    for (const command of ["/queue", "/queue list"]) {
      notifications.length = 0;
      const beforeMessages = session.messages.length;
      await session.prompt(command);
      assert.equal(session.messages.length, beforeMessages, "Slash list must not launch an agent run");
      assert.equal(notifications.length, 1);
      const { text, level } = notifications[0];
      assert.equal(level, "info");
      assert.doesNotMatch(text, /Completed|#done|Done/, "Slash list must hide completed history");
      for (const section of ["In progress:", "Pending:", "Blocked:"]) assert.ok(text.includes(section));
      if (fixture === mixed) {
        for (const task of ["#current Current", "#first First", "#second Second", "#blocked Blocked"]) assert.ok(text.includes(task), task);
        assert.ok(text.indexOf("#first First") < text.indexOf("#second Second"), "Pending order must remain unchanged");
      } else {
        assert.match(text, /Current: none/);
        assert.match(text, /Pending: 0/);
        assert.match(text, /Blocked: 0/);
      }
      assert.equal(readFileSync(todo, "utf8"), fixture, "Slash list must not mutate TODO");
    }
  }
  writeFileSync(todo, mixed);
  const listed = await invoke({ action: "list" });
  assert.equal(listed.isError, false);
  assert.match(listed.result.content[0].text, /Completed \(queue-managed\)/);
  assert.match(listed.result.content[0].text, /#done Done/);
  assert.equal(listed.result.details.completed[0].id, "done");
  assert.equal(readFileSync(todo, "utf8"), mixed, "Tool list must not mutate TODO");
  writeFileSync(todo, template);
  const selected = await invoke({ action: "claim", id: "second" });
  assert.equal(selected.isError, false, JSON.stringify(selected.result));
  assert.equal(selected.result.details.task.id, "second", "Explicit id must select second, not first");
  assert.match(readFileSync(todo, "utf8"), /## In progress\n- \[ \] Second/);
  for (const id of ["missing", "blocked", "done", ""]) {
    writeFileSync(todo, template);
    const rejected = await invoke({ action: "claim", id });
    assert.equal(rejected.isError, true, `Rejected id ${id} must use native error channel`);
    assert.equal(readFileSync(todo, "utf8"), template, "Rejected claim must not mutate TODO");
  }
  writeFileSync(todo, template);
  const fifo = await invoke({ action: "claim" });
  assert.equal(fifo.isError, false);
  assert.equal(fifo.result.details.task.id, "first");
  const active = readFileSync(todo, "utf8");
  const second = await invoke({ action: "claim", id: "second" });
  assert.equal(second.isError, true);
  assert.equal(readFileSync(todo, "utf8"), active);
  assert.deepEqual(errors, []);
  // Observe real metadata watchers; still use the real filesystem and SDK event dispatch.
  const watchers = new Set();
  fs.watchFile = (path, options, listener) => {
    if (String(path) === todo) watchers.add(listener);
    return originalWatchFile(path, options, listener);
  };
  fs.unwatchFile = (path, listener) => {
    if (String(path) === todo) watchers.delete(listener);
    return originalUnwatchFile(path, listener);
  };
  syncBuiltinESMExports();
  const widgets = new Map();
  let paints = 0;
  const uiContext = { notify: (text, level) => notifications.push({ text, level }), setWidget: (key, factory) => {
    paints++;
    if (factory) widgets.set(key, factory); else widgets.delete(key);
  } };
  const tuiDir = dirname(findPackageJSON("@earendil-works/pi-tui", pathToFileURL(join(sdkDir, "dist/index.js"))));
  const { visibleWidth } = await import(pathToFileURL(join(tuiDir, "dist/index.js")));
  const { theme, initTheme } = await import(pathToFileURL(join(sdkDir, "dist/modes/interactive/theme/theme.js")));
  initTheme("dark", false);
  const render = (width = 100) => widgets.get("todo-queue")?.(null, theme).render(width) ?? [];
  const waitFor = async predicate => {
    const deadline = Date.now() + 5000;
    while (!predicate()) { assert.ok(Date.now() < deadline, "Panel update timed out"); await new Promise(r => setTimeout(r, 40)); }
  };
  for (const mode of ["headless", "rpc"]) {
    await session.bindExtensions({ mode, uiContext });
    assert.equal(watchers.size, 0);
    assert.equal(widgets.size, 0);
  }
  settingsManager.setProjectTrusted(false);
  await session.bindExtensions({ mode: "tui", uiContext });
  await session.prompt("/queue panel");
  assert.equal(watchers.size, 0, "Untrusted projects must not start a watcher");
  assert.equal(widgets.size, 0);
  settingsManager.setProjectTrusted(true);
  writeFileSync(todo, mixed);
  await session.bindExtensions({ mode: "tui", uiContext });
  assert.equal(watchers.size, 1);
  assert.match(render().join("\n"), /Current|First|Second/);
  assert.doesNotMatch(render().join("\n"), /Done|#done/);
  for (const width of [1, 2, 8, 25, 100]) for (const line of render(width)) assert.ok(visibleWidth(line) <= width);
  const messageCount = session.messages.length;
  await session.prompt("/queue panel");
  assert.equal(render().length, 1);
  await session.prompt("/queue panel");
  assert.ok(render().length > 1);
  assert.equal(session.messages.length, messageCount);
  assert.equal(readFileSync(todo, "utf8"), mixed);
  await session.prompt("+ Added through queue");
  await waitFor(() => render().join("\n").includes("Added through queue"));
  assert.equal(session.messages.length, messageCount);
  const replacement = join(root, "replacement.md");
  writeFileSync(replacement, mixed.replace("First", "外部 👩‍💻 e\u0301"));
  fs.renameSync(replacement, todo);
  await waitFor(() => render().join("\n").includes("外部"));
  for (const width of [1, 2, 3, 8, 20]) for (const line of render(width)) assert.ok(visibleWidth(line) <= width);
  writeFileSync(todo, mixed + "\n## Pending\n");
  await waitFor(() => render().join("\n").includes("не удалось"));
  assert.doesNotMatch(render().join("\n"), /Current|First/);
  writeFileSync(todo, mixed);
  await waitFor(() => render().join("\n").includes("Current"));
  await session.reload();
  assert.equal(watchers.size, 1, "Reload must replace, not accumulate, watchers");
  assert.match(render().join("\n"), /Current/);
  const staleChange = [...watchers][0];
  await session.bindExtensions({ mode: "tui", uiContext });
  writeFileSync(todo, mixed.replace("Current", "Fresh generation"));
  await Promise.all([[...watchers][0](), staleChange()]);
  assert.match(render().join("\n"), /Fresh generation/, "An old callback must not invalidate a fresh read");
  await session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
  assert.equal(watchers.size, 0);
  assert.equal(widgets.size, 0);
  const afterShutdown = paints;
  writeFileSync(todo, template);
  await new Promise(r => setTimeout(r, 1200));
  assert.equal(paints, afterShutdown, "No disposed-session repaint");
  await session.bindExtensions({ mode: "tui", uiContext });
  const reading = [...watchers][0](); // Real watcher callback starts an asynchronous filesystem read.
  await session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
  const stoppedPaints = paints;
  await reading;
  assert.equal(paints, stoppedPaints, "Late read must not repaint a disposed UI");
  assert.equal(watchers.size, 0);
  await session.bindExtensions({ mode: "tui", uiContext });
  fs.unlinkSync(todo);
  await waitFor(() => widgets.size === 0);
  writeFileSync(todo, mixed);
  await waitFor(() => render().join("\n").includes("Current"));
  writeFileSync(todo, historyOnly);
  await waitFor(() => widgets.size === 0);
  await session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
  fs.unlinkSync(todo);
  await session.bindExtensions({ mode: "tui", uiContext });
  assert.equal(watchers.size, 0, "No file at startup means no watcher");
  writeFileSync(todo, mixed);
  await session.prompt("/queue panel");
  assert.equal(watchers.size, 1);
  assert.equal(render().length, 1);
  assert.equal(readFileSync(todo, "utf8"), mixed);
  assert.equal(session.messages.length, messageCount, "Panel lifecycle must not call a model");
  assert.deepEqual(errors, []);
  console.log("PASS actual queue SDK: existing selection/errors/history plus native panel, real width handling, collapse, atomic external edit, parse recovery, reload, missing/empty files, non-TUI and shutdown cleanup; no production TODO mutation");
} finally {
  if (session) await session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
  session?.dispose();
  fs.watchFile = originalWatchFile;
  fs.unwatchFile = originalUnwatchFile;
  syncBuiltinESMExports();
  if (previous === undefined) delete process.env.PI_CODING_AGENT_DIR;
  else process.env.PI_CODING_AGENT_DIR = previous;
  rmSync(root, { recursive: true, force: true });
}
