## ADDED Requirements

### Requirement: Task session handoff has offline native coverage
The mandatory gate MUST exercise actual native SDK command-backed replacement with a faux provider in temporary sessions. Coverage MUST include clean new context, automatic execution, cancellation, rejection boundaries and queue assessment before claim. No credentials, live models or production sessions may be used.

#### Scenario: Native integration gate
- **WHEN** npm test runs
- **THEN** goal-continuity policy wiring, real session handoff and queue dispatch boundaries are checked with finite deadlines; semantic model quality is not claimed
