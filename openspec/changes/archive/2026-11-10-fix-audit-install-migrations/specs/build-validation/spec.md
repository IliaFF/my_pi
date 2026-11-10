## ADDED Requirements

### Requirement: Installer migration has actual filesystem regression coverage
Mandatory gate MUST exercise actual installer preflight/configuration/backup/migration blocks and uninstall CLI against temporary profiles, including known old files, private siblings, modified legacy refusal, linked APPEND/ancestors, exact rollback and idempotence. It MUST verify snapshot isolation with the actual APPEND manifest entry and retain existing SDK gates.

#### Scenario: Mandatory source regression
- **WHEN** npm test runs
- **THEN** migration, rollback and privacy failures reject the build without production writes, credentials or external model calls
