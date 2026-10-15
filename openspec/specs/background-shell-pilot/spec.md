# background-shell-pilot Specification

## Purpose
Provide a narrowly scoped local shell-job pilot with enforced process-only admission, bounded output and deadlines, explicit cancellation, notification-only completion and truthful reload/restart limits.

## Requirements

### Requirement: Local process-only background admission
The pilot MUST load only the shell extension entry and MUST reject agent tasks and automatic follow-up wake at shared admission, including EventBus callers. Delegate/Fusion/attested/attribution features MUST be unavailable even with environment override. Tools MUST describe notification-only operation accurately. Arbitrary explicit shell commands remain unsandboxed and local.

#### Scenario: Ordinary job
- **WHEN** a named shell command is launched
- **THEN** launch returns without waiting, status records exit state, bounded logs remain accessible, and no provider/model turn starts

#### Scenario: Unsafe request
- **WHEN** tool or EventBus requests isAgent true, automatic completion wake or an unapproved feature override
- **THEN** request fails before process creation or extension activation

### Requirement: Bounded lifecycle and truthful recovery
Jobs MUST have a finite default deadline and fixed per-job log cap. Explicit cancellation MUST stop the Linux process tree. Only opted ordinary shell jobs MAY survive actual same-process reload with unchanged identity; quit/restart MUST NOT claim process adoption. Terminal logs retained across sessions MUST not imply continued execution. Cross-session total disk quota and SSH are outside this pilot and MUST be disclosed.

#### Scenario: Timeout or output overflow
- **WHEN** deadline or output cap is reached
- **THEN** task becomes terminal, child execution stops, and bounded diagnostics remain available

#### Scenario: Reload opt-in
- **WHEN** a surviving shell job experiences real same-process Pi reload
- **THEN** its identity/PID remain stable, default jobs terminate and completion cannot wake the model

#### Scenario: Shutdown and restart
- **WHEN** session quits and a new runtime starts
- **THEN** old child is stopped and no process is adopted from historical task records
