## ADDED Requirements

### Requirement: Process-only background pilot has real offline lifecycle checks
The mandatory gate MUST exercise actual current Pi SDK and package shell lifecycle in a temporary workspace with no credentials or external provider calls, bounded test subprocess deadlines and cleanup of child trees. It MUST retain all existing SDK and CLI gates.

#### Scenario: Full offline regression
- **WHEN** process-only package pin/patch changes
- **THEN** success/error/timeout/cancel/log-limit/reload/shutdown checks and unsafe-request rejection run before runtime acceptance
