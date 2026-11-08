// shortcut: best-effort redaction is not DLP, disable external review for confidential projects.
export function redact(input: unknown): string {
  let value = String(input ?? "");
  for (const [name, secret] of Object.entries(process.env)) {
    if (/KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|AUTH/i.test(name) && secret && secret.length >= 6) {
      value = value.split(secret).join("[REDACTED]");
    }
  }
  return value
    .replace(/-----BEGIN [\w ]*PRIVATE KEY-----[\s\S]*?(?:-----END [\w ]*PRIVATE KEY-----|$)/g, "[REDACTED PRIVATE KEY]")
    .replace(/\b(?:sk-or-|sk-|ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]{12,}/g, "[REDACTED TOKEN]")
    .replace(/\bBearer\s+[^\s"'<>]+/gi, "Bearer [REDACTED]")
    .replace(/([?&](?:token|api_key|key|secret)=)[^\s&]+/gi, "$1[REDACTED]")
    .replace(/((?:api[_-]?key|access[_-]?token|password|secret|authorization)\s*["']?\s*[:=]\s*)["']?[^\s,;"'}]+/gi, "$1[REDACTED]");
}

export function redactMetadata(value: unknown): unknown {
  if (typeof value === "string") return redact(value);
  if (Array.isArray(value)) return value.map(redactMetadata);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [redact(key), redactMetadata(item)]));
  }
  return value;
}

export function failureReason(error: unknown, signal?: AbortSignal): string {
  const value = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? "");
  if (signal?.aborted || /abort/i.test(value)) return "aborted";
  const status = value.match(/\b(?:HTTP\s*)?([45]\d\d)\b/i)?.[1];
  if (status) return `HTTP ${status}`;
  const network = value.match(/\b(ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN)\b/)?.[1];
  if (network) return `network ${network}`;
  if (/timeout|timed out/i.test(value)) return "timeout";
  if (/auth|credential|api.?key/i.test(value)) return "authentication unavailable";
  if (/missing|model absent|unavailable/i.test(value)) return "model unavailable";
  return "request failed (details omitted)";
}
