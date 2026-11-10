## ADDED Requirements

### Requirement: APPEND baseline is source only
Maintenance snapshot MUST NOT import runtime APPEND_SYSTEM.md into portable source. Installer MUST remove exactly recognized retired terminal policy sections, runner configuration and Jev extension files after backup, preserve unrelated private configuration/files and drop retired settings.subagents. New defaults MUST NOT contain orphan readseek, thresholds or cooldownMs keys.

#### Scenario: Private runtime snapshot
- **WHEN** maintenance snapshot runs with private APPEND and the real manifest
- **THEN** portable configs/APPEND_SYSTEM.md remains byte-identical

#### Scenario: Known legacy profile
- **WHEN** a recognized older profile is upgraded in preservation mode
- **THEN** retired behavior and settings are absent, unrelated content survives, and repeat migration changes no bytes
