# Spec Delta

## MODIFIED Requirements

### Requirement: Approved inventory is reproducible
The build MUST provide pinned Firstmate, Herdr backend, Treehouse, workspace-history, the three user style skills, patched paper-search MCP and AITunnel registration. Firstmate MUST remain a separate checkout with project-scoped Pi extensions, not a global extension copy. The build MUST NOT provision pi-browser-use, Chrome/Jev MCP, or their dedicated dependencies, binaries and launchers.

#### Scenario: Fresh supported installation
- **WHEN** approved installation completes on its documented supported platform
- **THEN** the agreed non-browser components are present at their declared versions and Firstmate can be launched separately without automatically starting agents
- **THEN** no retired browser integration is configured or provisioned by the build
- **THEN** optional browser features in pi-markdown-preview and pi-web-access remain unchanged by explicit user choice

### Requirement: Explicit Pi-only installation
The installer MUST provide --skip-stack to update managed Pi packages, patches and configuration without provisioning or requiring the separate Firstmate/paper-search stack. Default full-stack installation MUST provide the approved non-browser inventory. Backup, rollback and mandatory source/host gates MUST remain active.

#### Scenario: Existing Pi without a private stack
- **WHEN** installation is explicitly invoked with --skip-stack
- **THEN** private-stack preflight and bootstrap are not invoked and no missing paper-search private-launcher MCP entry is added

#### Scenario: Existing custom MCP configuration
- **WHEN** Pi-only installation encounters existing MCP server entries
- **THEN** retired chrome/jev-browser entries are removed while paper-search and unrelated servers remain intact

## ADDED Requirements

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
