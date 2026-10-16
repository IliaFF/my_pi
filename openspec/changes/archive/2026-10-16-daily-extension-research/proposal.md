# Daily extension research

## Why
The user requests a long-lived daily catalog check and explicitly selected VPS, current Codex subscription, up to ten candidates/day and Hermes Telegram results. Existing updater only repairs known packages; it must stay unchanged.

## What Changes
Add a separate read-only npm Pi-gallery-eligible catalog monitor. Persist new/version-changed candidates, cap one model batch/day at ten packages and 15 minutes, provide bounded untrusted README/source excerpts, and notify via existing Hermes. Use the existing subscription grant with serialized refresh, no API-key fallback, tools, installation, publication or automatic code changes. Add isolated tests, an explicit VPS installer/disabled timer and operation/rollback documentation.

## Capabilities
### New Capabilities
- `extension-research`: bounded discovery, review and notification without runtime mutation.

## Impact
Standalone controller/tests/deployment/docs only. No new npm dependencies, Pi extension, task store or changes to existing updater/controller/timer. Rollout separately approved by user's VPS/model/Telegram choices.
