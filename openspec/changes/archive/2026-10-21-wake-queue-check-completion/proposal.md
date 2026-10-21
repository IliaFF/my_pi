# Proposal

## Why
`task_queue check` explicitly disables completion wake. A failed/timed-out gate therefore delivers a notification without resuming the agent, unlike ordinary background jobs. The user requests automatic continuation.

## What Changes
Enable native completion follow-up for recorded checks, preserving snapshots, process-only admission and finite deadlines. Update tool documentation and exercise real nested SDK calls with an offline faux provider.

## Capabilities
### Modified Capabilities
- `task-selection`: recorded check completion starts or queues native continuation.
- `build-validation`: offline check tests may use scripted model continuation, never external providers.

## Impact
Queue launcher, tool description, README and SDK regression. Deployment was initially excluded; the user subsequently explicitly approved installation after PASS with backup/preserve-settings and host validation. No push or paid live calls. Diagnose observed gate timeouts separately; do not relax assertions to report success.
