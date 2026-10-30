## ADDED Requirements

### Requirement: Autocompaction has no emergency packet dependency
The extension MUST NOT extract or write emergency recovery packets, carry their paths in follow-ups, or require a writable recovery directory. Existing user recovery files MUST remain untouched. Threshold, compactability, retention and continuation lifecycle MUST remain unchanged.

#### Scenario: Recovery location is unwritable
- **WHEN** context reaches the configured compactable threshold but the former recovery location cannot be created
- **THEN** compact starts normally and no packet filesystem operation or packet reference is produced

#### Scenario: Deterministic owner remains singular
- **WHEN** both extensions load in either order and Pi compacts
- **THEN** context-fold alone supplies the index, no model/auth call occurs, and manual compaction remains idle
