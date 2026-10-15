# Process-only background shell pilot

## Why
User approved the process-only pilot after review: long local shell jobs with status/logs/cancel, no delegates/Fusion/provider mutation/automatic model wake. Peer ranges are not a rejection criterion; actual offline behavior on current Pi must pass before runtime installation.

## What Changes
Pin existing published pi-background-tasks 2.6.10, select only background-tasks entry (never attribution). A version-gated package patch makes process-only enforceable: feature parser accepts process only, shared shell admission rejects agent/wake requests, defaults become notification-only and bounded, update check disabled. Preserve existing package versions and personal settings. Verify actual SDK lifecycle/jobs including opt-in same-process reload and restart cancellation. No new manager or provider call.

## Capabilities
### New Capabilities
- background-shell-pilot: limited local process lifecycle with bounded logs.
### Modified Capabilities
- build-validation: mandatory offline real SDK regression for process-only jobs.

## Impact
npm pin/lock, settings, version-gated patch manifest, offline test/harness, README. Isolated staged npm install first; full backup before approved runtime activation. Logs are project-local .pi/tasks and processes are unsandboxed; no SSH routing. Per-task log cap is not a global project disk quota. Runtime activation only after source acceptance checks. No paid calls/push/current CI.
