# Design
## Private native events
Use --mode json instead of --print for the one-shot repair CLI. The native stream includes tool_execution_start with arguments before execution, unlike text print mode's final-only output. Keep the existing root-private log outside ephemeral job storage. Explicitly chmod the log to 0600. Full events may contain sensitive model/tool content and must never be copied into Telegram, journal, public Git or test evidence.

## Structured termination status
Remove --collect so a failed worker is still queryable after systemd-run --wait exits. Before stopping/resetting the unit, request only Result, ExecMainCode and ExecMainStatus. Admit known result categories and numeric exit fields, never arbitrary systemctl output. Save launcher return code, timeout flag, log byte count and worker status to an atomic 0600 JSON sidecar. A missing/failed status query must not turn a failed launcher into success. Classify worker SIGXFSZ separately from a launcher signal (including log/output cap), deadline, ordinary exit and unknown status. Stop the control group and reset the retained failed unit in finally; global cleanup also resets matching failed workers after an interrupted controller. Rotate old log/status pairs together; existing file/output budgets and retry policy remain.

## Scope and verification
Reproduce a real default-SIGXFSZ capped subprocess that flushes an operation event before exceeding a small per-file fixture limit; verify log/sidecar survive and notification text excludes secrets. Also exercise success, worker nonzero/signal, launcher signal, missing/malformed worker metadata and timeout cleanup through the real sandbox method with external systemd boundaries stubbed. Verify native JSON flags in actual repair orchestration. The full existing real-SDK/RPC gate remains, not replaced with mocks. No provider or live retry during source validation.

## Limits
The retained stream identifies the last attempted operation, not necessarily the exact file that exceeded the limit. Events can themselves reach the unchanged log cap; classification must distinguish that case when supported by launcher/worker status. Historical empty logs cannot be recovered. New private JSON logs require the same root-only handling as credentials. Preserve the project's unpublished commits and use a separately approved scoped publication later.
