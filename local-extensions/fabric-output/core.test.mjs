import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { compactNative, fabricArtifact, sourceOutput } from "./core.mjs";
import { compactOutput } from "./reducers.mjs";

const outerDir = await mkdtemp(join(tmpdir(), "pi-fabric-output-test-"));
const bashPath = join(tmpdir(), "pi-bash-0123456789abcdef.log");
try {
  const outerPath = join(outerDir, "output.txt"), raw = Array.from({ length: 5000 }, (_, i) => `line ${i + 1}${i === 2500 ? " MIDDLE_SENTINEL" : ""}`).join("\n");
  await Promise.all([writeFile(outerPath, raw), writeFile(bashPath, raw)]);
  const outerVisible = `short\n[Full output (${raw.length} chars) saved to: ${outerPath}]`;
  const bashVisible = `tail\n[Showing lines 3001-5000 of 5000. Full output: ${bashPath}]`;
  assert.deepEqual(fabricArtifact(outerVisible), { path: outerPath, chars: raw.length, kind: "fabric" });
  assert.deepEqual(fabricArtifact(bashVisible), { path: bashPath, kind: "bash" });
  assert.equal((await sourceOutput([{ type: "text", text: outerVisible }])).text, raw);
  assert.equal((await sourceOutput([{ type: "text", text: bashVisible }])).text, raw);
  for (const artifact of [{ path: outerPath, chars: raw.length, kind: "fabric" }, { path: bashPath, kind: "bash" }]) {
    const compact = compactNative(raw, { artifact, outcome: "succeeded", ref: "pi.read" }, 24000);
    assert.ok(compact.length <= 24000 && compact.includes(artifact.path) && !compact.includes("MIDDLE_SENTINEL"));
  }
  assert.match(compactOutput("10 passed, 2 failed\nFAIL suite\n fatal detail", { command: "npm test" }, 1000), /FAIL: 2/);
  assert.match(compactOutput("Compiling x\nerror: boom", { command: "cargo build" }, 1000), /error: boom/);
  assert.match(compactOutput("a.ts:1:first\na.ts:2:second", { ref: "pi.grep" }, 1000), /2 matches/);
  assert.equal(fabricArtifact("[Full output (1 chars) saved to: /etc/passwd]"), undefined);
  assert.equal(fabricArtifact("[Full output: /tmp/pi-bash-../../etc/passwd]"), undefined);
  assert.equal((await sourceOutput([{ type: "text", text: "plain" }])).artifact, undefined);
  console.log("fabric-output native-first tests: 12/12 PASS");
} finally { await Promise.all([rm(outerDir, { recursive: true, force: true }), rm(bashPath, { force: true })]); }
