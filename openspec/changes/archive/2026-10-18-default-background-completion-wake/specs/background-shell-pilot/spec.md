## MODIFIED Requirements

### Requirement: Local process-only background admission
The pilot MUST load only shell jobs, reject agents at shared admission and disable Delegate/Fusion/attested/attribution despite overrides. Ordinary bg_run and /bg jobs MUST default to completion wake; explicit false MUST disable it. EventBus MUST retain required explicit booleans. Invalid or contradictory requests MUST fail before spawn. Tool/EventBus descriptions MUST match policy.

#### Scenario: Ordinary job
- **WHEN** a named shell command is launched with default completion options
- **THEN** launch returns without waiting, status records exit state, bounded logs remain accessible, and terminal completion starts or queues exactly one provider/model follow-up turn, including failure and timeout

#### Scenario: Authorized explicit wake
- **WHEN** an ordinary tool or EventBus job explicitly requests completion wake with notifications enabled
- **THEN** terminal completion is delivered through the existing native Pi follow-up mechanism; idle Pi continues and busy Pi queues continuation without duplicate wake on status/log reads

#### Scenario: Explicit opt-out
- **WHEN** a tool job sets triggerOnCompletion false or disables notifications without explicit wake
- **THEN** explicit false keeps notification-only behavior; disabled notifications without explicit wake disable both notification and continuation, while explicit true with disabled notifications is rejected before spawn

#### Scenario: Unsafe request
- **WHEN** a caller requests isAgent true, malformed wake, wake with notifications disabled or an unapproved feature override
- **THEN** the request fails before process creation or extension activation

#### Scenario: Local execution and permissions
- **WHEN** an ordinary job runs or its completion resumes Pi
- **THEN** shell commands remain local and unsandboxed; wake MUST NOT grant new operational permissions

### Requirement: Bounded lifecycle and truthful recovery
Jobs MUST retain finite default deadlines and fixed per-job log caps. Cancellation MUST stop the Linux process tree; wake-enabled jobs MAY deliver killed completion wake. Only opted ordinary jobs MAY survive actual same-process reload with identity/completion policy intact. Quit/shutdown MUST suppress wake; restart MUST NOT adopt processes or replay historical wake. Retained logs MUST NOT imply continued execution.

#### Scenario: Timeout or output overflow
- **WHEN** deadline or output cap is reached
- **THEN** task becomes terminal, child execution stops, and bounded diagnostics remain available

#### Scenario: Reload opt-in
- **WHEN** a surviving shell job experiences real same-process Pi reload
- **THEN** its identity/PID and resolved completion policy remain stable, non-surviving jobs terminate and wake follows the resolved completion policy

#### Scenario: Shutdown and restart
- **WHEN** session quits and a new runtime starts
- **THEN** the old child is stopped, no process is adopted from historical task records and no completion starts a model turn during shutdown or from old history

#### Scenario: Scope disclosure
- **WHEN** the pilot is configured or documented
- **THEN** cross-session aggregate disk quota and SSH watching remain outside this pilot and MUST be disclosed
