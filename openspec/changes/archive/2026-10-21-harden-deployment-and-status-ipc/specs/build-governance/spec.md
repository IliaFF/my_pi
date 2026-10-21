## ADDED Requirements

### Requirement: Installer backups can be safely staged before restoration
Uninstall MUST accept all current exact managed paths, including task-session.ts, while retaining supported historical sets. It MUST fully stage and validate the archive before deleting current managed files. Extraction MUST reject unmanaged paths, escapes, unsafe links and special devices. Legitimate relative npm links MUST survive. Unrelated files and shared parent permissions MUST remain unchanged.

#### Scenario: Current installer backup
- **WHEN** a backup includes the current path set and npm .bin relative symlinks
- **THEN** dry-run and restoration succeed, preserving link targets and task-session bytes

#### Scenario: Malicious or incomplete archive
- **WHEN** the archive escapes its allowed destinations, contains unsafe links/devices, or lacks expected present paths
- **THEN** validation fails before changing any runtime file

### Requirement: Security remediation preserves dependency scope
A targeted transitive advisory fix MUST retain direct dependency pins and declared compatible ranges. The build MUST review lock changes and run dependency audit and offline SDK gates; it MUST NOT equate audit success with absence of exploitable service bugs.

#### Scenario: Hono static-middleware advisory
- **WHEN** vulnerable Hono is resolved through the existing MCP SDK dependency
- **THEN** the compatible patched lock is used without adding a direct package or blind audit fix, and no unrelated dependency updates are accepted
