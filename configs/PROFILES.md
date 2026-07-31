# Pi profiles

Launcher: `pi-profile <profile> [pi arguments]`

- `default` — native Pi file tools, `fffind`, structured clarification questions, lazy web tools, Telegram, retry, recovery-aware auto-ultra-compact, and UI helpers. `ffgrep` stays inactive; web/Telegram tools activate only when relevant.
- `research` — default plus Pi Context and Context Mode. Use for large logs/JSON, multi-phase research, or output likely above 20 lines.
- `typed` — default plus ReadSeek 0.5.18 and Lens; Lens context injection, autoformat, autofix, and noisy AST/navigation tools are disabled. Use when anchor-safe edits or LSP diagnostics justify overhead.
- `fabric` — one visible `fabric_exec` tool. QuickJS only; MCP, agents, mesh, network, and Fabric UI disabled. Use for repetitive batches where one orchestration call can replace many model/tool round trips.
- `tmux` — coordination profile with Intercom, Goal, Pi Context, and structured questions. Telegram is already available in default; this profile adds multi-session coordination.

Examples:

```bash
pi-profile default
pi-profile research -p "Analyze this build log"
pi-profile typed
pi-profile fabric -p "Apply the same checked change to these modules"
pi-profile tmux
```

Compaction in every profile: recovery-aware `auto-ultra-compact`, contract `recovery-v2-10k`, `reserveTokens: 12500` (hard summary output cap 10k), and `keepRecentTokens: 24000`. Preferred summarizer: `openai-codex/gpt-5.6-luna`, deterministic validation, one corrective retry, then Pi built-in fallback using current session model. Validated summaries resume directly; bounded recovery packets are emergency fallback and are read only when state is missing. Noncritical history may be stored as checksum-verified exact excerpts under `~/.pi/agent/context-store/`; summaries carry `ctxref://` pointers. Only lazy `context_recall` is restored from compacted history; other specialized tools route from current prompts. Pi Context tools remain profile-only.

`pi-lean-ctx` is not enabled. Local and independent tests showed useful compression in some paths but worse total efficiency than native Pi in controlled comparisons, plus a larger and more complex tool surface.
