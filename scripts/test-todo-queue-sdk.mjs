#!/usr/bin/env node
// Actual queue tool execution via Pi SDK; temporary TODO and faux provider only.
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { findPackageJSON } from "node:module";
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
  console.log("PASS actual queue SDK: unfinished-only slash lists, empty queue, full tool history, read-only listing, explicit second id, FIFO, rejected ids, current-task guard, native errors, no production TODO mutation");
} finally {
  session?.dispose();
  if (previous === undefined) delete process.env.PI_CODING_AGENT_DIR;
  else process.env.PI_CODING_AGENT_DIR = previous;
  rmSync(root, { recursive: true, force: true });
}
