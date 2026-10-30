## MODIFIED Requirements

### Requirement: Recorded checks are task-bound and snapshot-bound
The queue MUST bind check/checks to current task id/text, exact command/cwd, job id and bounded file fingerprints. Checks MUST use existing local process-only background tools and structured runner results, not logs or caller assertions. Checks MUST NOT poll, run agent jobs or adopt unrelated jobs. Completion MUST start or queue native model follow-up on success, nonzero exit and timeout without granting new permissions.

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

#### Scenario: Completion follow-up
- **WHEN** a recorded shell check succeeds, fails or times out
- **THEN** native completion notification starts or queues exactly one model continuation; inspecting checks/status does not duplicate it and never turns failure into PASS
