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

### Requirement: Trusted exact settings pins follow release targets
The controller MUST synchronize only existing exact npm package declarations in portable configs/settings.json that match baseline dependency pins, using the trusted selected targets. It MUST prepare this configuration before repair and reject any candidate settings bytes or executable mode other than that deterministic result. Floating sources, package membership/order, resource filters, unrelated settings and all other configs MUST remain protected.

#### Scenario: Browser-use release changes its configured pin
- **WHEN** a baseline exact browser-use declaration is 0.1.26 and the selected target is 0.1.28
- **THEN** repair starts with that declaration set to 0.1.28 and no other configuration change

#### Scenario: Candidate changes configuration beyond trusted pins
- **WHEN** repair changes another setting, selectors, package list, version or executable mode, or deletes the file
- **THEN** acceptance rejects the candidate before gate or publication

#### Scenario: No managed exact pin changes
- **WHEN** no baseline exact declaration matches an updated managed dependency
- **THEN** portable settings bytes and mode remain unchanged

### Requirement: Unfinished current OpenSpec is reported as incomplete repair
A newly created unarchived change matching the current autoupdate fingerprint MUST remain rejected, with a bounded incomplete-repair diagnostic directing the operator to private logs. The controller MUST NOT auto-archive failed work, disclose model logs or relax protected-file acceptance.

#### Scenario: Repair stops for a protected-change blocker
- **WHEN** repair leaves its current change unarchived after stopping
- **THEN** the controller reports incomplete repair instead of presenting its metadata as a generic protected-file violation, and never starts acceptance gate or publication

#### Scenario: Other protected files or previous evidence change
- **WHEN** repair changes protected configuration, tests, controller or existing OpenSpec history
- **THEN** the existing protected rejection remains in force
