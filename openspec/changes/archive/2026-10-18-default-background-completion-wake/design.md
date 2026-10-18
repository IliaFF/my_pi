# Design
Reuse native durable notification/follow-up delivery and deduplication. Shared startTask defaults triggerOnCompletion to notifyOnCompletion !== false; explicit true with notifications false remains invalid. bg_run uses the same fallback, /bg explicitly requests true. EventBus still requires both booleans, so callers do not silently change behavior. Queue checks retain explicit false.

No new manager, options, dependencies or remote watcher. Keep process-only admission, deadlines, output cap, reload survival and shutdown/history suppression. Default wake covers success, failure, timeout and cancellation, queues while busy and survives opted reload. Notifications disabled without explicit wake imply no wake.

Extend actual SDK/faux-provider tests before code changes: default success/failure/timeout, /bg, explicit opt-outs, busy/reload defaults and unchanged explicit wake. Full npm test and patch replay gate before evidence/archive/commit. Offline evidence does not establish live provider/UI availability. Production activation requires separate approval.
