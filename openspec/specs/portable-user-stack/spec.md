# portable-user-stack Specification

## Purpose

Воспроизводить согласованный пользовательский стек Pi и Firstmate из portable Git-источника, не перенося личный runtime и настройки подключения к удалённым машинам.

## Requirements

### Requirement: Approved inventory is reproducible
The build MUST provide pinned Firstmate, Herdr backend, Treehouse, workspace-history, the three user style skills, patched paper-search MCP and AITunnel registration. Firstmate MUST remain a separate checkout with project-scoped Pi extensions, not a global extension copy. The build MUST NOT provision pi-browser-use, Chrome/Jev MCP, or their dedicated dependencies, binaries and launchers.

#### Scenario: Fresh supported installation
- **WHEN** approved installation completes on its documented supported platform
- **THEN** the agreed non-browser components are present at their declared versions and Firstmate can be launched separately without automatically starting agents
- **THEN** no retired browser integration is configured or provisioned by the build
- **THEN** optional browser features in pi-markdown-preview and pi-web-access remain unchanged by explicit user choice

### Requirement: Portable configuration excludes private runtime
Published source MUST exclude credentials, sessions, device identifiers, local host inventories, SSH addresses/routes/keys and agent data. Provider and MCP secrets MUST be supplied separately. Existing user instructions and custom servers MUST survive installation in the documented preservation mode.

#### Scenario: Maintenance snapshot
- **WHEN** generic maintenance snapshot/restore is invoked
- **THEN** source-only AGENTS/MCP/provider/style templates remain unchanged and private runtime content is neither imported nor overwritten; legacy managed snapshots retain their previous behavior

#### Scenario: Customized profile
- **WHEN** source defaults are applied to an existing profile in preservation mode
- **THEN** unrelated user content remains unchanged and only missing portable managed instruction blocks and server defaults are added

### Requirement: Bootstrap is bounded and recoverable
Installation MUST verify fixed source revisions and direct release-artifact checksums before execution, use finite network deadlines, refuse unsafe existing destinations and participate in backup/rollback. It MUST NOT silently overwrite an existing independent Firstmate home or restart services/agents.

#### Scenario: Existing independent home
- **WHEN** the machine already has a Firstmate checkout with runtime data
- **THEN** the build leaves it untouched and installs or verifies its separate managed destination

#### Scenario: Final checkout verification fails
- **WHEN** the final tracked Firstmate verification fails during a new build
- **THEN** no complete marker or active launcher is published, and the incomplete store is retained for inspection

#### Scenario: Rollback preserves unrelated skill files
- **WHEN** a user adds unrelated files beside a newly installed style SKILL.md and restores the pre-install backup
- **THEN** only the managed SKILL.md is restored or removed, unrelated sibling files remain unchanged, and historical managed path sets remain supported

### Requirement: Paper search matches the installed implementation
Paper-search MUST use its verified upstream commit plus the exact reviewed installed-code delta and fixed dependencies. Local dirty source and backup files MUST NOT enter the distribution.

#### Scenario: Source differs from deployed server
- **WHEN** the installed server differs from both local HEAD and working tree
- **THEN** the published patch reproduces the installed module rather than silently selecting either source variant

### Requirement: Release artifact downloads tolerate bounded slow transfers
Direct release-artifact downloads MUST allow up to 540 seconds while retaining the enclosing 600-second command limit, finite connection deadline, HTTPS restriction, maximum artifact size and checksum verification before installation.

#### Scenario: Slow successful artifact download
- **WHEN** a pinned artifact needs more than 240 but fewer than 540 seconds to download
- **THEN** the downloader permits completion and still validates its SHA-256 before installing it

#### Scenario: Download exceeds its deadline
- **WHEN** the transfer exceeds 540 seconds
- **THEN** download failure propagates through the existing incomplete-store retention and installer rollback behavior

### Requirement: Explicit Pi-only installation
The installer MUST provide --skip-stack to update managed Pi packages, patches and configuration without provisioning or requiring the separate Firstmate/paper-search stack. Default full-stack installation MUST provide the approved non-browser inventory. Backup, rollback and mandatory source/host gates MUST remain active.

#### Scenario: Existing Pi without a private stack
- **WHEN** installation is explicitly invoked with --skip-stack
- **THEN** private-stack preflight and bootstrap are not invoked and no missing paper-search private-launcher MCP entry is added

#### Scenario: Existing custom MCP configuration
- **WHEN** Pi-only installation encounters existing MCP server entries
- **THEN** retired chrome/jev-browser entries are removed while paper-search and unrelated servers remain intact

### Requirement: Browser removal preserves unrelated runtime
An explicitly approved browser-removal migration MUST back up affected files before changes and remove browser package registrations, browser MCP entries and managed browser executables/dependencies. It MUST preserve SSH, paper-search, other non-browser capabilities, private settings, credentials, sessions, Firstmate data, system browsers, personal browser data and shared caches. Unsafe or ambiguous cleanup targets MUST be rejected before deletion.

#### Scenario: Existing personal installation
- **WHEN** an existing installation is updated with approved browser removal and settings preservation
- **THEN** pi-browser-use settings and registrations, Chrome/jev-browser MCP entries and managed browser launchers are absent
- **THEN** unrelated configuration and credentials remain unchanged, and the existing Firstmate checkout and paper-search environment remain available without reprovisioning

#### Scenario: Unsafe filesystem target
- **WHEN** a browser cleanup target is linked outside its managed scope or contains unclassified user data
- **THEN** cleanup refuses that target without deleting data and reports the impediment

#### Scenario: Repeat migration
- **WHEN** browser removal is applied again to an already migrated installation
- **THEN** it succeeds without changing unrelated files or recreating browser integrations

#### Scenario: Restore approved backup
- **WHEN** the verified pre-migration backup is restored after a failed update
- **THEN** affected runtime configuration and managed files return to the recorded previous state without deleting unrelated data
