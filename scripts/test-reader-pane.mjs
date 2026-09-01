import assert from "node:assert/strict";
import test from "node:test";
import {
  adaptWideTables,
  buildDocument,
  collectSafeImages,
  sanitizeMarkdown,
  selectLatestAssistantText,
  selectReaderBackend,
} from "../local-extensions/reader-pane.ts";

test("reader backend supports WSL and native tmux", () => {
  assert.equal(selectReaderBackend({ WSL_DISTRO_NAME: "Ubuntu", TMUX: "socket", TMUX_PANE: "%1" }), "wsl-windows-terminal");
  assert.equal(selectReaderBackend({ TMUX: "socket", TMUX_PANE: "%1" }), "tmux");
  assert.equal(selectReaderBackend({ TMUX: "socket" }), undefined);
});

test("wide table becomes readable cards", () => {
  const input = [
    "| Пакет | Что делает | Вердикт |",
    "|---|---|---|",
    "| pi-tool-wal | SQLite-журнал операций и crash recovery | Только наблюдаемость, не сокращает model rounds |",
  ].join("\n");
  const output = adaptWideTables(input, 50);
  assert.match(output, /Широкая таблица показана карточками/);
  assert.match(output, /### 1\. pi-tool-wal/);
  assert.match(output, /\*\*Что делает\*\*[\s\S]*SQLite-журнал операций и crash recovery/);
  assert.match(output, /\*\*Вердикт\*\*[\s\S]*Только наблюдаемость, не сокращает model rounds/);
  assert.doesNotMatch(output, /\|---\|/);
});

test("narrow and fenced tables stay unchanged", () => {
  const narrow = "| A | B |\n|---|---|\n| 1 | 2 |";
  const fenced = "```md\n| Long heading | Another long heading |\n|---|---|\n| long value | another long value |\n```";
  assert.equal(adaptWideTables(narrow, 80), narrow);
  assert.equal(adaptWideTables(fenced, 10), fenced);
});

test("table parser keeps escaped and inline-code pipes inside cells", () => {
  const input = "| Name | Value |\n|---|---|\n| escaped | a\\|b |\n| code | `a|b` |";
  const output = adaptWideTables(input, 10);
  assert.match(output, /a\\\|b/);
  assert.match(output, /`a\|b`/);
  assert.equal((output.match(/^### /gm) || []).length, 2);
});

test("sanitizer strips terminal control bytes", () => {
  assert.equal(sanitizeMarkdown("safe\u001b[31mred\u0000"), "safe[31mred");
});

test("sanitizer blocks image loading outside fenced code", () => {
  const input = "![remote](https://example.test/a.png)\n```md\n![example](./kept.png)\n```\n<img src='x'>";
  const output = sanitizeMarkdown(input);
  assert.match(output, /\[image blocked\] \[remote\]\(https:\/\/example\.test\/a\.png\)/);
  assert.match(output, /!\[example\]\(\.\/kept\.png\)/);
  assert.match(sanitizeMarkdown("![ref][target]"), /\[image blocked\] \[ref\]\[target\]/);
  assert.match(output, /\[image blocked by safe reader\]/);
});

test("latest nonempty assistant text wins", () => {
  const messages = [
    { role: "assistant", content: [{ type: "text", text: "first" }] },
    { role: "toolResult", content: [{ type: "text", text: "tool" }] },
    { role: "assistant", content: [{ type: "thinking", thinking: "hidden" }, { type: "text", text: "final" }] },
  ];
  assert.equal(selectLatestAssistantText(messages), "final");
});

test("safe PNG tool image is accepted and deduplicated", () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]).toString("base64");
  const messages = [{ role: "toolResult", content: [
    { type: "image", mimeType: "image/png", data: png },
    { type: "image", mimeType: "image/png", data: png },
    { type: "image", mimeType: "image/svg+xml", data: Buffer.from("<svg/>").toString("base64") },
  ] }];
  const images = collectSafeImages(messages);
  assert.equal(images.length, 1);
  assert.equal(images[0].extension, "png");
});

test("document links only generated image names", () => {
  const doc = buildDocument("**hello**", ["image-1-abc.png"], new Date("2026-01-02T03:04:05Z"));
  assert.match(doc, /# Last Pi response/);
  assert.match(doc, /\*\*hello\*\*/);
  assert.match(doc, /!\[Pi output 1\]\(\.\/image-1-abc\.png\)/);
});
