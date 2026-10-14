## ADDED Requirements

### Requirement: Portable maintenance archive can run isolated gate
Mandatory gate MUST run from a deployed source archive without Git metadata. Git-ignore verification MUST use a temporary repository carrying the source ignore rules, without initializing or modifying the installed directory.

#### Scenario: Deployed maintenance source has no Git directory
- **WHEN** the gate runs from an installed archive with locked tooling and runtime dependencies
- **THEN** ignore-rule regression runs in a temporary repository and does not fail because the archive has no .git
