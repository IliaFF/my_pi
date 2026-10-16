## ADDED Requirements

### Requirement: Updated Ponytail overrides retain the portable patch
The approved 5.3.0 baseline MUST retain request-local base-skill filtering and session-language review/audit instructions in both personal and active project package installations. Explicit commands, loader resources and all other package files MUST remain unchanged.

#### Scenario: Project override after stock package update
- **WHEN** an unpatched project Ponytail 5.3.0 overrides the personal package
- **THEN** the same backed-up versioned patch is restored there and the actual SDK mode/command/language regression passes with core 1.3.0
