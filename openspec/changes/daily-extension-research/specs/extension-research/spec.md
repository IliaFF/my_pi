# extension-research Specification

## ADDED Requirements

### Requirement: Bounded truthful search discovery
The monitor MUST bound npm discovery by pages, bytes and time, persist versioned candidates, and commit a search snapshot only after all pages succeed. Interrupted pagination MUST start no model work. It MUST deduplicate records, disclose coverage counts and never claim exhaustive catalog coverage. Persistently reviewed versions MUST not be reviewed again automatically.

#### Scenario: Ranked pages overlap
- **WHEN** upstream search repeats a package or changes total
- **THEN** coverage records duplicates and initial/final totals with exhaustive=false; an otherwise successful page walk may review only observed candidates

#### Scenario: Catalog scan fails midway
- **WHEN** a page fails or a safety bound is exceeded
- **THEN** the previous catalog remains valid and no model review starts

#### Scenario: No changed candidates
- **WHEN** a complete scan contains no eligible pending versions
- **THEN** no model or authentication call occurs

### Requirement: Single daily subscription review
The monitor MUST attempt at most one batch per UTC day with at most ten candidates and a 900-second worker limit. It MUST record the daily attempt before starting a worker. It MUST use only the approved existing VPS OpenAI subscription, serialize with the updater and never install, publish or modify working Pi packages.

#### Scenario: Restart after worker failure
- **WHEN** the day's batch failed or the controller restarted after launch
- **THEN** a second model batch is not launched that day

#### Scenario: Existing updater active
- **WHEN** the updater lock cannot be acquired
- **THEN** the monitor skips shared-auth access and does not interrupt the updater

### Requirement: Untrusted packages cannot execute
The reviewer MUST receive only bounded public metadata/text excerpts and a portable stack profile. Package code, lifecycle scripts and archive paths MUST never execute or write into the host. The model MUST have no tools, MCP, private sessions, SSH or Hermes access. A non-root worker MUST have bounded runtime/resources and no write access outside its own job.

#### Scenario: Malicious archive or prompt
- **WHEN** a package contains path traversal, unsafe members, excessive expansion or instructions to execute/install
- **THEN** unsafe inputs are rejected and package instructions cannot enable actions

### Requirement: Durable truthful results and scoped rollout
The monitor MUST persist report/outbox state and retry failed Telegram delivery without repeating model work. Logs and messages MUST exclude OAuth/provider secrets. Invalid refreshed credentials MUST preserve the old grant. Installation and rollback MUST affect only the new monitor and preserve the existing updater, settings and runtime.

#### Scenario: Notification unavailable
- **WHEN** Hermes delivery fails
- **THEN** the bounded unsent notification remains queued for later delivery

#### Scenario: Rollback
- **WHEN** the new timer/service is disabled and removed
- **THEN** existing updater files/timer and unrelated credentials remain intact
