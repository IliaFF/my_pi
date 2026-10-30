## MODIFIED Requirements

### Requirement: Approved deployment can preserve personal configuration
Installer MUST provide an explicit configuration-preserving deployment mode. Existing personal settings, instructions and context policy MUST survive; only explicit npm pins for managed runtime dependencies MAY change to exact source versions. Credentials and sessions MUST NOT be overwritten. Missing personal files MUST receive portable defaults. Existing backup and rollback MUST cover changed managed files.

#### Scenario: Existing customized runtime
- **WHEN** explicitly approved locked deployment uses preservation mode with custom settings, package objects and instructions
- **THEN** provider/model/custom fields and package options stay unchanged, known pinned packages align to source, instructions and context policy remain byte-identical

#### Scenario: Fresh agent in preservation mode
- **WHEN** preservation mode is selected but personal configuration is absent
- **THEN** portable defaults are installed

#### Scenario: Published release diverges from local source
- **WHEN** an approved installation follows integration of published changes with local commits
- **THEN** local behavior and private configuration are preserved, exact merged source and host gates pass, and any active project override is backed up and validated separately before being reported as updated
