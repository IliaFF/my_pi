## MODIFIED Requirements

### Requirement: Local process-only background admission
The pilot MUST load only the shell entry, reject agent jobs at shared admission (including EventBus), and disable Delegate/Fusion/attested/attribution despite environment overrides. Ordinary jobs MUST default to notification-only. Only explicit boolean triggerOnCompletion true with enabled notifications MAY wake a model; invalid/contradictory requests MUST fail before spawn. Tool/EventBus policy descriptions MUST be accurate.

#### Scenario: Ordinary job
- **WHEN** a named shell command is launched without explicit wake
- **THEN** launch returns without waiting, status records exit state, bounded logs remain accessible, and completion starts no provider/model turn

#### Scenario: Authorized explicit wake
- **WHEN** an ordinary tool or EventBus job explicitly requests completion wake with notifications enabled
- **THEN** terminal completion is delivered through the existing native Pi follow-up mechanism; idle Pi continues and busy Pi queues continuation without duplicate wake on status/log reads

#### Scenario: Unsafe request
- **WHEN** a caller requests isAgent true, malformed wake, wake with notifications disabled or an unapproved feature override
- **THEN** the request fails before process creation or extension activation

#### Scenario: Local execution and permissions
- **WHEN** an ordinary job runs or its completion resumes Pi
- **THEN** shell commands remain local and unsandboxed; wake MUST NOT grant new operational permissions

### Requirement: Bounded lifecycle and truthful recovery
Jobs MUST retain finite default deadlines and fixed per-job log caps. Cancellation MUST stop the Linux process tree; opted jobs MAY deliver killed completion wake. Only opted ordinary jobs MAY survive actual same-process reload with identity/completion policy intact. Quit/shutdown MUST suppress wake; restart MUST NOT adopt processes or replay historical wake. Retained logs MUST NOT imply continued execution.

#### Scenario: Timeout or output overflow
- **WHEN** deadline or output cap is reached
- **THEN** task becomes terminal, child execution stops, and bounded diagnostics remain available

#### Scenario: Reload opt-in
- **WHEN** a surviving shell job experiences real same-process Pi reload
- **THEN** its identity/PID and explicit completion policy remain stable, default jobs terminate and wake occurs only when explicitly requested

#### Scenario: Shutdown and restart
- **WHEN** session quits and a new runtime starts
- **THEN** the old child is stopped, no process is adopted from historical task records and no completion starts a model turn during shutdown or from old history

#### Scenario: Scope disclosure
- **WHEN** the pilot is configured or documented
- **THEN** cross-session aggregate disk quota and SSH watching remain outside this pilot and MUST be disclosed
