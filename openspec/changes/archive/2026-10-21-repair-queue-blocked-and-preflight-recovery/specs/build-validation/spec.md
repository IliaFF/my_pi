## ADDED Requirements

### Requirement: Queue recovery has mandatory offline native coverage
The mandatory gate MUST exercise preflight failure before background launch, explicit replacement across scopes, obsolete endpoint avoidance, launched-failure rejection and Blocked recovery through actual Pi SDK/background execution with a faux provider in temporary workspaces. Reopen without a fresh check and unsafe reopens MUST fail without mutating TODO. Old records MUST remain; no production TODO, settings, credentials or provider calls may be used.

#### Scenario: Mandatory recovery gate
- **WHEN** npm test runs
- **THEN** pure state/freshness assertions and actual native queue recovery scenarios run with finite deadlines alongside existing tests
