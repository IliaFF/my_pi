## ADDED Requirements

### Requirement: Optional status IPC failures are nonfatal
A failed optional herdr status/session report MUST NOT cause an unhandled rejection or abort a native session. Existing successful delivery and ordinary retry behavior MUST remain. Mandatory tests MUST NOT inherit the live pane identity or socket, and MUST retain fail-closed network denial.

#### Scenario: Transport throws synchronously
- **WHEN** native session/agent events run with net.createConnection throwing NETWORK_BLOCKED
- **THEN** the session still finishes using its faux provider without unhandled rejection, crash record or external IPC

#### Scenario: Inherited live pane environment
- **WHEN** mandatory tests construct their isolated environment
- **THEN** live HERDR identity/socket variables are absent; a dedicated synthetic case still exercises denied IPC
