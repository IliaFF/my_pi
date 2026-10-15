## Why
Assess pi-subagents 0.78.0 against the existing Pi 1.2.0 process-only stack before adding runtime cost and orchestration. User approved current-Codex-only live checks and backup-protected deployment after passing checks.

## What Changes
- Add a reproducible isolated evaluation with actual Pi SDK and pinned third-party package; no production package installation by default.
- Check permissions, budgets, stop/result persistence, declared tools/context and potential collisions with current extensions.
- Only after offline safety passes, permit up to four live top-level model runs using current Codex, no nested delegation or other providers. This is a launch cap, not a guaranteed token/dollar cap.
- Adopt only supported measurable improvements; preserve notification-only bg_run and no automatic per-edit reviews.

## Capabilities
### New Capabilities
- `bounded-subagents-evaluation`: isolated safety/compatibility checks and guarded live admission.

### Modified Capabilities
None unless evaluation demonstrates a justified production change.

## Impact
Evaluation script/docs/specs; third-party dependencies and reports stay in temporary/ignored locations. No credentials, sessions, private prompts or provider responses in Git. Working runtime changes, if justified, require backup, full gate and preserved unrelated settings.
