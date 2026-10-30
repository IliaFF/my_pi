# herdr-agents-adoption Specification

## Purpose
Pin Herdr agents and its bundled sidebar in the portable build, and define scoped, recoverable activation that preserves private runtime settings and active sessions.

## Requirements

### Requirement: Approved installation is scoped and recoverable
Deployment MUST have a verified private pre-state backup before mutation and preserve unrelated package versions, settings, credentials, histories and existing Herdr view. Current managed backups MUST include new config while rollback MUST still accept prior exact managed path sets. Running sessions/server MUST NOT be restarted implicitly.

#### Scenario: Customized existing profile
- **WHEN** the exact package and linked sidebar are installed
- **THEN** other direct dependencies/private fields remain unchanged, plugin actions are verified without invoking them, and installed-versus-loaded status plus rollback are reported

#### Scenario: Previous backup
- **WHEN** a valid pre-adoption backup is restored
- **THEN** its exact previous path set remains accepted, without allowing arbitrary destinations

### Requirement: Retired Pi plugin is not reinstalled
Default installation MUST omit pi-herdr-agents and its permanent routing paragraph. Removing this default MUST NOT delete standalone Herdr, Firstmate code, agent state or personal configuration.

#### Scenario: Fresh stack installation
- **WHEN** the approved source is installed
- **THEN** workspace history is available without the retired Pi plugin and Firstmate can still use its separate Herdr backend
