## Why
Successful pre-archive queue checks block completion after their commands become obsolete. The current seed index also spends limited user-intent slots on restore boilerplate and queue headings rather than task content.

## What Changes
- Add explicit, reasoned supersede of an obsolete successful check by a current successful check of the same task/text/cwd, retaining ledger history and snapshot guards. Failed/unknown/running/invalidated checks cannot be hidden.
- Versioned context-fold 0.7.0 patch: skip only the owned restore envelope and extract the task from the owned queue envelope in both soft and hard indexes.
- Add regression/SDK tests and a characterization for multiline constraints; do not claim or implement full semantic preservation.

## Capabilities
### Modified Capabilities
- `task-selection`: safe explicit replacement of stale passed checks.
- `compaction-reliability`: substantive user intents without owned control-message pollution.

## Impact
queue check module/tool schema/docs; manifest + reproducible vendor patch; existing SDK and build gate tests. No dependency version, runtime install, old task status or private log changes. Commit/push follows existing authorized source-publication workflow.
