import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Opt-in: PI_PROFILE=1 pi ...
export default function loopProfiler(pi: ExtensionAPI) {
  if (!/^(1|true|yes)$/i.test(process.env.PI_PROFILE ?? "")) return;

  const output = process.env.PI_PROFILE_OUT ?? `/tmp/pi-profile-${process.pid}.jsonl`;
  const startedNs = process.hrtime.bigint();
  const records: Record<string, unknown>[] = [];
  let run = 0;
  let turn = -1;
  let request = 0;
  let firstAssistantDelta = false;
  let flushed = 0;

  const nowMs = () => Number(process.hrtime.bigint() - startedNs) / 1e6;
  const mark = (event: string, data: Record<string, unknown> = {}) => {
    records.push({ event, t_ms: +nowMs().toFixed(3), run, turn, request, ...data });
  };
  const flush = () => {
    if (flushed >= records.length) return;
    mkdirSync(dirname(output), { recursive: true });
    appendFileSync(output, records.slice(flushed).map((r) => JSON.stringify(r)).join("\n") + "\n");
    flushed = records.length;
  };
  const contentChars = (message: any): number => {
    const content = message?.content;
    if (typeof content === "string") return content.length;
    if (!Array.isArray(content)) return 0;
    return content.reduce((n, item) => n + (typeof item?.text === "string" ? item.text.length : 0), 0);
  };

  mark("profiler_loaded", { pid: process.pid, output });

  pi.on("session_start", (event, ctx) => mark("session_start", {
    reason: event.reason,
    mode: ctx.mode,
    provider: ctx.model?.provider,
    model: ctx.model?.id,
    thinking: ctx.thinkingLevel,
  }));
  pi.on("input", (event) => { mark("input", { source: event.source, chars: event.text.length }); });
  pi.on("before_agent_start", (event) => {
    run += 1;
    turn = -1;
    request = 0;
    firstAssistantDelta = false;
    mark("before_agent_start", {
      prompt_chars: event.prompt.length,
      system_prompt_chars: event.systemPrompt.length,
      selected_tools: event.systemPromptOptions.selectedTools?.length ?? 0,
      context_files: event.systemPromptOptions.contextFiles?.length ?? 0,
      skills: event.systemPromptOptions.skills?.length ?? 0,
      tool_names: event.systemPromptOptions.selectedTools,
      skill_names: event.systemPromptOptions.skills?.map((skill: any) => skill.name),
    });
  });
  pi.on("agent_start", () => mark("agent_start"));
  pi.on("turn_start", (event) => { turn = event.turnIndex; mark("turn_start"); });
  pi.on("context", (event) => {
    mark("context_ready", {
      messages: event.messages.length,
      content_chars: event.messages.reduce((n: number, m: any) => n + contentChars(m), 0),
    });
  });
  pi.on("before_provider_headers", () => mark("provider_headers_ready"));
  pi.on("before_provider_request", (event) => {
    request += 1;
    firstAssistantDelta = false;
    let payloadBytes: number | undefined;
    let toolSchemaBytes: Array<{ name: string; bytes: number }> | undefined;
    try {
      payloadBytes = Buffer.byteLength(JSON.stringify(event.payload));
      const tools = (event.payload as any)?.tools;
      if (Array.isArray(tools)) {
        toolSchemaBytes = tools.map((tool: any) => ({
          name: tool?.name ?? tool?.function?.name ?? tool?.type ?? "unknown",
          bytes: Buffer.byteLength(JSON.stringify(tool)),
        })).sort((a, b) => b.bytes - a.bytes);
      }
    } catch {}
    mark("provider_request", { payload_bytes: payloadBytes, tool_schema_bytes: toolSchemaBytes });
  });
  pi.on("after_provider_response", (event) => mark("provider_response", { status: event.status }));
  pi.on("message_update", (event) => {
    if (event.message.role !== "assistant" || firstAssistantDelta) return;
    const kind = event.assistantMessageEvent?.type;
    if (kind === "text_delta" || kind === "thinking_delta" || kind === "toolcall_delta") {
      firstAssistantDelta = true;
      mark("first_assistant_delta", { kind });
    }
  });
  pi.on("tool_execution_start", (event) => mark("tool_start", { id: event.toolCallId, tool: event.toolName }));
  pi.on("tool_call", (event) => mark("tool_preflight", { id: event.toolCallId, tool: event.toolName }));
  pi.on("tool_execution_end", (event) => mark("tool_end", { id: event.toolCallId, tool: event.toolName, error: event.isError }));
  pi.on("message_end", (event) => {
    if (event.message.role !== "assistant") return;
    const usage = (event.message as any).usage;
    mark("assistant_message_end", {
      chars: contentChars(event.message),
      input_tokens: usage?.input,
      output_tokens: usage?.output,
      cache_read_tokens: usage?.cacheRead,
      cache_write_tokens: usage?.cacheWrite,
    });
  });
  pi.on("turn_end", (event) => mark("turn_end", { tools: event.toolResults.length }));
  pi.on("agent_end", () => mark("agent_end"));
  pi.on("agent_settled", () => { mark("agent_settled"); flush(); });
  pi.on("session_shutdown", (event) => { mark("session_shutdown", { reason: event.reason }); flush(); });
}
