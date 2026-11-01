## ADDED Requirements

### Requirement: Explicit Pi-only installation
The installer MUST provide --skip-stack to update managed Pi packages, patches and configuration without provisioning or requiring the separate Firstmate/MCP/browser stack. Default full-stack installation MUST remain unchanged. Backup, rollback and mandatory source/host gates MUST remain active.

#### Scenario: Existing Pi without a private stack
- **WHEN** installation is explicitly invoked with --skip-stack
- **THEN** private-stack preflight and bootstrap are not invoked, no private Playwright browser is downloaded and no missing Jev/paper private-launcher MCP entry is added

#### Scenario: Existing custom MCP configuration
- **WHEN** Pi-only installation encounters existing MCP server entries
- **THEN** those entries remain intact, including previously configured Jev and paper-search entries
