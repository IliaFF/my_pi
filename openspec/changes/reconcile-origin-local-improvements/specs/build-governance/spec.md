## ADDED Requirements

### Requirement: Reconciled installer rollback retains staged integrity safeguards
Installer failure recovery MUST use the same validated restore path as manual recovery. Restore MUST retain the latest managed destination allowlist, read the complete archive before mutation, resolve links within saved managed trees and verify restored bytes, symlink targets and executable bits before reporting success.

#### Scenario: Corrupt archive trailer
- **WHEN** a backup archive has a corrupt gzip checksum
- **THEN** restore fails before current managed files are removed

#### Scenario: New managed portable paths and internal npm links
- **WHEN** a valid backup includes current managed paths and internal npm links
- **THEN** restored contents match staged contents and unmanaged files are preserved
