# Show unfinished tasks in slash queue listings

## Why

The /queue notification includes completed history and grows with every finished task. The user selected all unfinished tasks: In progress, Pending and Blocked. There is no request for a pin/unpin mechanism.

## What Changes

- Hide the Completed section in /queue and /queue list notifications.
- Preserve current status, active/pending/blocked tasks, ordering and IDs.
- Preserve completed history in TODO.md and the full task_queue action=list response.

## Impact

Queue formatter, slash-command caller, extension README and actual-SDK regression. No queue storage/API/schema migration, runtime deployment or new dependencies.
