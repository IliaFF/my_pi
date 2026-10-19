## MODIFIED Requirements

### Requirement: Release validation follows exact candidate pins
Release validation MUST verify a stable core pin consistent with installer, runtime SDK and TUI pins instead of requiring a historical release number. Published-package replay MUST use the candidate's exact extension version while preserving existing behavioral assertions and lock consistency checks.

#### Scenario: Newer consistent core release
- **WHEN** manifest, installer, SDK, TUI and lock agree on a newer stable release
- **THEN** historical version literals alone do not reject it

#### Scenario: Mismatched installer or nonstable core
- **WHEN** installer differs from manifest or core is not stable semver
- **THEN** release validation fails before accepting the release

#### Scenario: October 19 exact candidate preserves local contracts
- **WHEN** pine-of-glass is updated to 0.18.1 and the other eighteen selected exact targets remain aligned
- **THEN** the unchanged full npm test MUST pass with existing patches, SDK integration and startup smoke before this change is archived
