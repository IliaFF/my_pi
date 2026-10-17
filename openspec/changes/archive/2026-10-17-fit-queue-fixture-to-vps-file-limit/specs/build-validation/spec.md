## ADDED Requirements

### Requirement: Snapshot resource fixtures fit the trusted VPS sandbox
The mandatory gate MUST exercise real queue fingerprint aggregate-byte rejection without requiring any individual fixture file larger than the existing 64 MiB VPS file limit. An offline subprocess regression MUST enforce that same per-file limit. Production fingerprint budgets, sandbox limits, deadlines and assertions MUST NOT be weakened to obtain a passing result.

#### Scenario: Oversized aggregate under per-file limit
- **WHEN** the real queue fixture runs with RLIMIT_FSIZE=64 MiB
- **THEN** multiple bounded sparse files exceed the unchanged 256 MiB aggregate budget and the fingerprint rejects them with its byte-limit error instead of setup failing with EFBIG
