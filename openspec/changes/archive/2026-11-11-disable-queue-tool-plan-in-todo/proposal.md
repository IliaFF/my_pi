## Why
The user reports DeepSeek does not follow the `task_queue` workflow and asked to disable the queue tool and instead require a written plan in `TODO.md` before every major action.

## What Changes
- Stop loading the `todo-queue` extension in the managed profile and in portable settings; keep its modules on disk because `task-session.ts` imports the store/core helpers.
- Replace the queue claim/id/check policy text in `APPEND_SYSTEM.md` (portable baseline and this runtime) with a simple rule: write the plan into the project root `TODO.md` before every major action and record the check result there.
- Update policy assertions so the gate enforces the new text.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
None. `skip_specs: true`: this is a profile/policy configuration change; no new behavior contract is added beyond the updated assertions.

## Impact
Portable `configs/settings.json`, `configs/APPEND_SYSTEM.md`, the matching runtime files in `~/.pi/agent`, test assertions and README. The extension source, its tests, installer-managed file copy, Firstmate checkout and unrelated settings stay unchanged. No provider calls, no dependency or version changes. The running session keeps the already-loaded queue tool until restart.
