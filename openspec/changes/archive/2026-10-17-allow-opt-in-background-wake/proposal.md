# Why
The user explicitly authorizes opt-in continuation after ordinary shell jobs. The process-only pilot currently rejects every completion wake; notifications therefore cannot resume an idle agent. Keep its default and all unrelated restrictions.

# What Changes
Permit `triggerOnCompletion:true` with notifications enabled for ordinary shell jobs at the shared registry boundary, tool schema and EventBus capability. Keep default false, reject malformed or contradictory requests, retain agent/Fusion/delegate/attribution restrictions and existing limits. Reuse upstream completion delivery rather than adding another scheduler or manager. Explain local-only execution and explicit cancellation semantics. Activate only the local installed package after backup and real offline SDK verification; no publication, VPS change or restart of the running Pi session.

# Capabilities
## Modified Capabilities
- `background-shell-pilot`: ordinary jobs may explicitly request completion continuation.
- `build-validation`: actual SDK/faux-provider acceptance for idle/busy completion, duplicates and lifecycle.

# Impact
Versioned package patch, patch manifest reason, native background integration test, README and specs. No package version, provider route, settings/auth or external model call. Current UI needs explicit reload/restart to load changed code; offline tests are not a live UI/provider test.
