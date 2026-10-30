## ADDED Requirements

### Requirement: Adoption pins both components
Portable source MUST pin pi-herdr-agents 3.3.1 and its settings spec. The sidebar MUST come from the verified bundled package matching tested Git revision. Defaults MUST enable status/sidebar, limit persistent specialists to one and leave model/provider, tool restrictions and Focus unselected.

#### Scenario: Fresh agent
- **WHEN** an installer creates missing configuration
- **THEN** it initializes herdr-agents/config.json without overwriting an existing custom file and the default package loads once

### Requirement: Approved installation is scoped and recoverable
Deployment MUST have a verified private pre-state backup before mutation and preserve unrelated package versions, settings, credentials, histories and existing Herdr view. Current managed backups MUST include new config while rollback MUST still accept prior exact managed path sets. Running sessions/server MUST NOT be restarted implicitly.

#### Scenario: Customized existing profile
- **WHEN** the exact package and linked sidebar are installed
- **THEN** other direct dependencies/private fields remain unchanged, plugin actions are verified without invoking them, and installed-versus-loaded status plus rollback are reported

#### Scenario: Previous backup
- **WHEN** a valid pre-adoption backup is restored
- **THEN** its exact previous path set remains accepted, without allowing arbitrary destinations
