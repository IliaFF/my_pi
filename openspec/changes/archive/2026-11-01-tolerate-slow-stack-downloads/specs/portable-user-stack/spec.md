## ADDED Requirements

### Requirement: Release artifact downloads tolerate bounded slow transfers
Direct release-artifact downloads MUST allow up to 540 seconds while retaining the enclosing 600-second command limit, finite connection deadline, HTTPS restriction, maximum artifact size and checksum verification before installation.

#### Scenario: Slow successful artifact download
- **WHEN** a pinned artifact needs more than 240 but fewer than 540 seconds to download
- **THEN** the downloader permits completion and still validates its SHA-256 before installing it

#### Scenario: Download exceeds its deadline
- **WHEN** the transfer exceeds 540 seconds
- **THEN** download failure propagates through the existing incomplete-store retention and installer rollback behavior
