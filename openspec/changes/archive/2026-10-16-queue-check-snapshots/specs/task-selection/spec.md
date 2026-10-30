## ADDED Requirements

### Requirement: Recorded checks are task-bound and snapshot-bound
The queue MUST provide explicit check/checks operations backed by the existing local process-only background tools. A check MUST bind the current task id/text, exact command/cwd, job id and bounded file fingerprint before launch. Terminal results MUST come from structured runner metadata, not logs or caller assertions. Checks MUST NOT poll, wake a model, run agents or adopt unrelated jobs.

#### Scenario: Unchanged successful check
- **WHEN** a task starts a check, the runner exits successfully, and start/terminal-inspection/completion fingerprints agree
- **THEN** the record can support completion and includes actual job id and exit code

#### Scenario: Changed files or task
- **WHEN** a file is added, deleted, edited, mode-changed or the task text changes during/after a check
- **THEN** the old evidence cannot complete the task; snapshot failures and unavailable jobs are unknown, never PASS

#### Scenario: Pending, failed and repeated checks
- **WHEN** completion is attempted with a running job or latest failed/stale/unknown check
- **THEN** TODO remains unchanged; an explicit successful rerun can replace an earlier terminal failure for the same command/cwd

#### Scenario: Direct evidence and lifecycle isolation
- **WHEN** a task has never started recorded checks, or session/branch/task lifecycle changes
- **THEN** existing direct-evidence completion remains available for the former; records of a different lifecycle never authorize the latter
