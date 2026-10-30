# portable-user-stack Specification

## Purpose

Воспроизводить согласованный пользовательский стек Pi и Firstmate из portable Git-источника, не перенося личный runtime и настройки подключения к удалённым машинам.

## Requirements

### Requirement: Approved inventory is reproducible
The build MUST provide pinned Firstmate, Herdr backend, Treehouse, workspace-history, the three user style skills, Jev MCP, patched paper-search MCP and AITunnel registration. Firstmate MUST remain a separate checkout with project-scoped Pi extensions, not a global extension copy.

#### Scenario: Fresh supported installation
- **WHEN** approved installation completes on its documented supported platform
- **THEN** the agreed components are present at their declared versions and Firstmate can be launched separately without automatically starting agents

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
