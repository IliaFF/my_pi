## Decisions
Use existing native APIs and patch machinery, not a new prompt-rewriter extension. Codemode stays mode:on: mode:only would hide unrelated tools outside approval. No multi_tool_use.parallel exists in the SDK registry or bundled coding-agent/pi-ai source; a policy instruction cannot remove an externally supplied schema.

Use disable-model-invocation frontmatter for only help/gain/debt. Loader resources and extension aliases remain intact, including off/standalone modes.

In pi-web-access, derive loader selection from the active configured tool names. Remove only the redundant loader, not web tools. Keep registered loader executable for explicit/discovery access; restore it if a configured capability becomes inactive. Never equate arbitrary other web/MCP tools with configured package capabilities. Preserve upstream lazy/eager selection and session restoration. Removal can require a native transcript checkpoint on adapters: this scope does not promise cache prefix preservation for removal.

Keep generic policy in APPEND, detailed tool contracts in their owning tools, compaction-only restoration/summary contract in auto-ultra-compact. Remove duplicate task-session paragraph from APPEND because the handoff tool already supplies it. Condense background guidelines, retaining process-only local execution, unsandboxed commands, deadlines/caps, exact-scope evidence, notification/wake opt-outs, no polling, inspection exceptions, cancellation and reload limits.

## Verification
Failing actual SDK regressions before fixes; faux provider with network blocked, temporary HOME/agent/cwd only. Cover lazy activation and subsequent declarations, all/partial active loadouts, session reopen, eager adapter, renamed/disabled capabilities, explicit Ponytail aliases and native skills. Measure UTF-8 JSON declaration bytes/effective system prompt bytes with exact labels; do not add unlike scenarios. Full npm test, owned diff review, OpenSpec archive, commit; no install/push.
