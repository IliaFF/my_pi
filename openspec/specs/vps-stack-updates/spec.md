# vps-stack-updates Specification

## Purpose
Safely integrate new Pi and extension releases through an isolated daily VPS subscription agent, an immutable validation gate, exact-commit CI and checked publication without changing working installations.

## Requirements

### Requirement: Daily isolated subscription repair
The updater MUST check managed npm releases daily, serialize runs, and use a bounded non-root repair agent authenticated only through the authorized VPS ChatGPT subscription OAuth. Tests MUST run under a different UID without provider, SSH or Hermes credentials. Existing PC runtime and VPS applications MUST NOT be updated.

#### Scenario: New stable release
- **WHEN** npm latest is a newer stable version
- **THEN** an isolated candidate is prepared and the full credential-free gate runs before publication

#### Scenario: Overlap or exhausted retry budget
- **WHEN** another run holds the lock or three repair attempts failed for the same base and targets
- **THEN** another repair agent is not started

### Requirement: Immutable judge and checked fast-forward
The controller MUST reject protected edits, unsafe files, pin inconsistency and leaked credentials. It MUST never execute agent Git configuration or candidate code as root. Acceptance MUST require the full unchanged mandatory gate and successful trusted GitHub Actions push workflow for the exact candidate SHA and branch. Main MUST still equal the tested base; only a normal fast-forward push is permitted.

#### Scenario: Agent weakens a test or changes controller
- **WHEN** the candidate changes tests, CI, controller, instructions or managed configuration
- **THEN** publication is rejected even if agent-reported tests pass

#### Scenario: CI fails or main advances
- **WHEN** CI is failed, missing, stale, unavailable or main differs from the recorded base
- **THEN** main is not changed

### Requirement: Durable state and truthful notification
The updater MUST atomically persist pending CI, retry counts and notification outbox. It MUST resume pending work before invoking another agent, bound runtime and job disk use, and send result notifications through existing Hermes without exposing model logs or credentials.

#### Scenario: Restart after branch publication
- **WHEN** the controller restarts with a pending candidate
- **THEN** it checks that candidate rather than starting another repair

#### Scenario: Telegram unavailable
- **WHEN** Hermes delivery fails
- **THEN** the unsent message remains queued and a successful merge is not rolled back or repeated
