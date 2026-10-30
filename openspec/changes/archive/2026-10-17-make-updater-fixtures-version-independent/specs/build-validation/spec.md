## ADDED Requirements

### Requirement: Updater safety fixtures follow the baseline version
The mandatory offline updater tests MUST derive a newer stable target from each fixture baseline and cover updated/future pins. They MUST preserve exact-settings acceptance and rollback rejection, preparation before repair, and rejection of incomplete OpenSpec before gate/publication. Real pins, acceptance policy and resource limits MUST remain unchanged.

#### Scenario: Managed browser pin already equals the historical target
- **WHEN** the baseline browser dependency and settings are0.1.28
- **THEN** both updater fixtures exercise a strictly newer target and all existing acceptance/rejection assertions remain meaningful

#### Scenario: A future baseline is used
- **WHEN** a synthetic newer baseline pin is used
- **THEN** the same fixtures pass without source version-literal edits and incomplete repair still never reaches gate or publication
