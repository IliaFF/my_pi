# Native deferred rare tools

## Why
The initial tool declarations consume about7.1k tokens in the observed UI. Rare remote/export/context-maintenance schemas need not be declared in every fresh coding session. Existing native Pi1.2 discovery can preserve the cached prefix under additive loading; do not build another dispatcher.

## What Changes
- Mark only remote, preview_export, context_list/context_stats/context_purge as deferred in versioned package patches; retain every executor/validation/permission hook and other tools.
- Add native tool_search to portable defaultTools. Fresh sessions start compact; recorded sessions preserve their transcript tool set.
- Actual SDK tests load real packages, discover and execute safe status/stats/list operations, preserve resumed transcripts, and inspect real Codex payloads before transport.
- Document measured schema bytes, not guessed token/latency/cache-hit savings. Approved personal deployment is scoped and backed up; no dependency upgrades or paid/live probes.

## Capabilities
### New Capabilities
- deferred-tool-loading: native discovery, additive cache preservation, availability and resume semantics.
### Modified Capabilities
- build-validation: mandatory offline actual-package SDK/payload regression.

## Impact
Three package patches, a scoped startup loadout guard and installer/backup caller, manifest, portable settings, SDK test/gate, README and specs. Existing source baseline18c5588 clean. User approved source plus installation with backup; current conversation must not be reconfigured.
