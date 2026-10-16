# Compact project queue panel

## Why
Queue status currently needs a slash command. Add passive visibility without replacing the authoritative TODO.md or introducing a second session plan.

## What Changes
- Read-only compact TUI widget above the editor: current task, Pending/Blocked counts, up to three pending items and overflow count.
- `/queue panel` toggles a one-line collapsed view; expansion is session-local UI state only.
- Refresh external file changes, hide an empty/missing queue, show a bounded generic read/parse error instead of stale tasks. No watcher in headless/RPC/untrusted contexts; cleanup on session replacement/reload/shutdown.
- Preserve queue commands, tool contracts, file bytes and automatic execution rules.

## Capabilities
### Modified Capabilities
- `task-selection`: passive project queue display and lifecycle.
- `build-validation`: offline native SDK/TUI and lifecycle regressions.

## Impact
Queue extension and existing queue tests/docs, plus manifest/install copy wiring for its new panel module. No packages, config files, model requests, source publication or production installation.
