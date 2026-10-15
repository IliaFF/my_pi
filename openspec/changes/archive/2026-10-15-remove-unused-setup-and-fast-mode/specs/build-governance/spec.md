## ADDED Requirements

### Requirement: Approved optional package removal is scoped
An explicitly requested optional package removal MUST update portable declarations, dependency lock and installed package configuration without removing other direct dependencies or private user data. Runtime removal MUST have a recoverable pre-state backup. Already loaded extension hooks MUST NOT be reported as unloaded until reload/restart.

#### Scenario: User requests four optional packages removed
- **WHEN** removal is approved for pi-my-setup, pi-gpt-fast-mode, pi-telegram and pi-diff-review plus local reader-pane.ts
- **THEN** they are absent from source declarations and installed packages, other direct versions and personal settings remain unchanged except selected package declarations, and offline gates pass

#### Scenario: Package owns saved user configuration
- **WHEN** optional package is removed
- **THEN** saved configuration and credentials are preserved, and reload/restart requirement is explained

#### Scenario: Reader pane removal and historical restore
- **WHEN** source is installed after reader-pane removal
- **THEN** reader source/test/copy step and RPC command are absent, existing deployed file is removed, and a verified pre-removal backup may still restore that exact retired extension path
