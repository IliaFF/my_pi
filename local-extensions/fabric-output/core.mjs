import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { compactOutput } from "./reducers.mjs";

const outerPattern = /\[Full output \((\d+) chars\) saved to: ([^\]\n]+)\]/;
const bashPattern = /Full output: ([^\]\n]+pi-bash-[a-f0-9]{16}\.log)\]/;

export function fabricArtifact(text) {
  const outer = text.match(outerPattern);
  if (outer) {
    const path = outer[2], parent = dirname(path);
    if (dirname(parent) === tmpdir() && basename(parent).startsWith("pi-fabric-output-") && basename(path) === "output.txt") return { path, chars: Number(outer[1]), kind: "fabric" };
  }
  const bash = text.match(bashPattern), path = bash?.[1];
  if (path && dirname(path) === tmpdir() && /^pi-bash-[a-f0-9]{16}\.log$/.test(basename(path))) return { path, kind: "bash" };
  return undefined;
}

export function textContent(content) {
  return content.filter((part) => part.type === "text").map((part) => part.text).join("\n");
}

async function readRegularFile(path) {
  const file = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    if (!(await file.stat()).isFile()) throw new Error("artifact is not a regular file");
    return await file.readFile("utf8");
  } finally { await file.close(); }
}

export async function sourceOutput(content) {
  const visible = textContent(content), artifact = fabricArtifact(visible);
  if (!artifact) return { text: visible };
  try { return { text: await readRegularFile(artifact.path), artifact }; }
  catch { return { text: visible, artifact, incomplete: true }; }
}

export function compactNative(text, metadata, maxChars) {
  const chars = metadata.artifact.chars ?? text.length;
  const marker = `\n\n[Native ${metadata.artifact.kind} full output (${chars} chars): ${metadata.artifact.path}; exact retrieval: use pi.read/pi.grep through fabric_exec; outcome=${metadata.outcome}]`;
  const body = compactOutput(text, metadata, Math.max(1, maxChars - marker.length));
  return `${body.slice(0, Math.max(1, maxChars - marker.length))}${marker}`;
}
