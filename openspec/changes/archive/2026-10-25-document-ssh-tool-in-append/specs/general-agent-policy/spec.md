## ADDED Requirements

### Requirement: SSH work uses the available Pi tool
Permanent policy MUST direct SSH work to Pi's `remote` tool, discovered through `tool_search` when absent from current declarations. It MUST state that read/write/edit/bash use active SSH routing without duplicating the tool's detailed contract.

#### Scenario: Deferred SSH tool
- **WHEN** SSH work is needed and remote is not declared yet
- **THEN** the standing prompt points to native discovery and remote, while its executor and authorization remain unchanged

#### Scenario: Offline prompt verification
- **WHEN** the SDK regression assembles the permanent prompt
- **THEN** the SSH discovery/routing reminder is present without making a live connection
