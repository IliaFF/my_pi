## MODIFIED Requirements

### Requirement: Release validation follows exact candidate pins
Release validation MUST verify a stable core pin consistent with installer, runtime SDK and TUI pins instead of requiring a historical release number. Published-package replay MUST use the candidate's exact extension version while preserving existing behavioral assertions and lock consistency checks.

#### Scenario: Newer consistent core release
- **WHEN** manifest, installer, SDK, TUI and lock agree on a newer stable release
- **THEN** historical version literals alone do not reject it

#### Scenario: Mismatched installer or nonstable core
- **WHEN** installer differs from manifest or core is not stable semver
- **THEN** release validation fails before accepting the release

#### Scenario: Observability-only exact candidate update
- **WHEN** pine-of-glass changes from 0.17.0 to the selected exact 0.18.0 with core and TUI remaining 1.3.0
- **THEN** the unchanged full offline gate verifies exact locks, existing selected-extension startup, Meantime lifecycle, SDK contracts and patch replay without adding package selections or enabling lifecycle scripts
