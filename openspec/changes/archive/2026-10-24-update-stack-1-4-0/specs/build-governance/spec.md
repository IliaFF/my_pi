## ADDED Requirements

### Requirement: Approved stable stack updates preserve each runtime scope
An explicitly requested stable stack update MUST validate the exact source candidate with the full offline gate and preserve private configuration, credentials, sessions and unrelated dependencies in each approved installation. Active project overrides and actual CLI entry points MUST be checked separately from managed SDK pins. Deployment MUST have a recoverable verified backup, and failures or untested live behavior MUST be reported honestly.

#### Scenario: Local and VPS update requested
- **WHEN** the user approves updating source, local runtime and VPS
- **THEN** exact stable pins and version-gated patches pass source and host validation, local extra dependencies/overrides survive, and unrelated VPS applications and provider credentials remain unchanged
