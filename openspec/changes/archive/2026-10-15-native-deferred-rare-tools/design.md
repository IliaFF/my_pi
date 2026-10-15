# Design

## Minimal implementation
Use ToolDefinition.exposure=deferred on five existing registrations across pi-ssh-remote0.1.15, pi-markdown-preview0.22.2 and @spences10/pi-context0.1.16. No proxy, executor/schema rewrite or unload loops. A small local startup guard preserves only the six managed names on recorded-session startup. Add +tool_search alongside +codemode. Leave all bg lifecycle, questions, queue, coding tools and context search/get/export direct. Browser MCPs already codemode; do not alter them.

## Cache and sessions
Native additive tool changes are anchored in history by the current Codex adapter. Retain initial tools/instructions/cache key and previous input prefix; loading more appends declarations. Removal/redefinition or unsupported adapters fall back, so no automatic unloading. Exposure is registration metadata, not a modified JSON schema. Verify actual SDK recorded-session restoration: previously declared rare tools remain active without changing/redeclaring their schemas, while a fresh session hides them. Actual regression showed createAgentSession supplies defaults on reopen and does not restore prior rare-tool activation. A scoped session_start guard folds recorded tool additions/removals and restores only the five rollout names plus tool_search, leaving all unrelated UI/background/other tools alone. Fresh sessions without recorded declarations are untouched. Activating native tool_search is a fresh-default decision, not a mid-run toggle.

## Trust and safety
No SSH connection, renderer/browser launch, destructive purge, live provider/MCP or real auth in mandatory regression. Safe remote status and empty sidecar stats/list exercise real executors. Preview presence/schema/cancellation can be checked without rendering. Source patch application is isolated; production apply after full PASS and a hash-checked backup. Preserve all personal settings outside defaultTools addition, credentials, dependency versions, stored sessions and model/thinking selection. Restart loads patched code; cannot claim current process hot-reloaded.

## Measurement
Compare current pre-patch declarations to compact fresh declarations using actual metadata serialized bytes and name sets. Include tool_search overhead and retain exact semantics; no bytes-to-tokens assertion. Use faux provider and capture actual Codex onPayload before transport with fake credentials. Offline prefix invariants are not server cache-hit, TTL, performance or answer-quality evidence.
