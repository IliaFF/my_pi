## ADDED Requirements

### Requirement: Reconciled branches retain unique offline regressions
The mandatory gate MUST retain the latest upstream checks and the local Windows shell SDK and installer rollback integration regressions when reconciling divergent branches, without downgrading upstream dependency versions.

#### Scenario: Newer upstream with unique local fixes
- **WHEN** upstream portable changes are merged with local Windows and rollback fixes
- **THEN** real package SDK, CLI startup and installer failure regressions execute in isolated sandboxes with no production installation
