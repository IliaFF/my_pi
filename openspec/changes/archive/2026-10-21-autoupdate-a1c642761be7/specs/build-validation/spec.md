## MODIFIED Requirements

### Requirement: Release validation follows exact candidate pins
Release validation MUST verify a stable core pin consistent with installer, runtime SDK and TUI pins instead of requiring a historical release number. Published-package replay MUST use the candidate's exact extension version while preserving existing behavioral assertions and lock consistency checks.

#### Scenario: Newer consistent core release
- **WHEN** manifest, installer, SDK, TUI and lock agree on a newer stable release
- **THEN** historical version literals alone do not reject it

#### Scenario: Mismatched installer or nonstable core
- **WHEN** installer differs from manifest or core is not stable semver
- **THEN** release validation fails before accepting the release

#### Scenario: Selected extension-only candidate
- **WHEN** browser-use 0.1.29, pi-token-speed 0.12.0 and pi-web-access 0.43.0 are selected with core/TUI 1.3.0 and all other direct pins unchanged
- **THEN** exact installed versions and lock consistency are verified by the full unchanged offline gate before archive, without enabling lifecycle scripts or changing local contracts
