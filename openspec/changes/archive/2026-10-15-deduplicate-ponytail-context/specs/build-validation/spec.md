## ADDED Requirements

### Requirement: Ponytail context changes have real SDK coverage
The mandatory gate MUST verify Ponytail request-local discovery and explicit commands using actual Pi SDK and faux provider contexts in an isolated agent with no credentials or external requests.

#### Scenario: Offline mode and command regression
- **WHEN** the full gate runs
- **THEN** active modes, off restoration, standalone discovery, independent review and explicit base/review/audit commands are checked against real provider context and errors fail the gate
