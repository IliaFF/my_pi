## ADDED Requirements

### Requirement: Repair progress survives abrupt sandbox termination
Repair MUST use the native Pi JSON event stream, retained in a private 0600 bounded log outside the ephemeral job. Before cleanup, the controller MUST retain atomic 0600 metadata containing bounded allowlisted worker status, launcher return code, timeout state and log size. Existing output/file/resource limits, provider isolation, immutable acceptance and retry budgets MUST remain unchanged.

#### Scenario: File-size signal interrupts repair
- **WHEN** a worker emits a tool-start event and is then killed by SIGXFSZ
- **THEN** emitted private progress and trusted termination metadata survive cleanup and the public diagnostic identifies the worker signal/file-size category without copying event content

#### Scenario: Launcher output cap or unavailable service status
- **WHEN** the launcher fails or times out and worker status is absent or invalid
- **THEN** the controller retains available bounded facts, rejects the attempt and never infers success or a specific failing file

#### Scenario: Successful or failed worker cleanup
- **WHEN** sandbox execution terminates
- **THEN** the controller collects status before stopping/resetting the unit and does not retain live worker trees or stale failed units

#### Scenario: Sensitive progress and malformed status
- **WHEN** model events or status output contain arbitrary text
- **THEN** only the private bounded log may retain model events and notifications/sidecar status fields contain only trusted categories and numeric facts, never raw model/systemctl output
