## MODIFIED Requirements

### Requirement: Approved deployment can preserve personal configuration
Installer MUST provide an explicit configuration-preserving deployment mode. Existing personal settings, instructions and context policy MUST survive; explicit npm pins MAY align to exact source versions and exactly recognized retired policy sections/settings MAY be migrated only after backup, preserving all unrelated bytes. Credentials and sessions MUST NOT be overwritten. Missing personal files MUST receive portable defaults. Existing backup and rollback MUST cover changed managed files.

#### Scenario: Existing customized runtime
- **WHEN** explicitly approved locked deployment uses preservation mode with custom settings, package objects and instructions
- **THEN** provider/model/custom fields and package options stay unchanged, known pinned packages align to source, context policy and unrelated instruction bytes remain identical, and exactly recognized retired instructions/settings may be migrated after backup

#### Scenario: Fresh agent in preservation mode
- **WHEN** preservation mode is selected but personal configuration is absent
- **THEN** portable defaults are installed

#### Scenario: Published release diverges from local source
- **WHEN** an approved installation follows integration of published changes with local commits
- **THEN** local behavior and private configuration are preserved, exact merged source and host gates pass, and any active project override is backed up and validated separately before being reported as updated

## ADDED Requirements

### Requirement: Legacy profile migration is backed up and exact
Installer MUST inspect APPEND destinations and retired target files before modifying the profile. It MUST reject linked destinations/ancestors and unknown modified legacy targets. After backup it MUST remove only exactly recognized previously shipped policy sections and retired files, preserve all unrelated bytes/files and include every changed retired destination in the current restore set.

#### Scenario: Upgrade a known old profile
- **WHEN** preservation-mode installation encounters recognized terminal instructions and retired runner/Jev files
- **THEN** backup precedes migration, unrelated instructions and neighboring files remain, and actual uninstall restores all modified files

#### Scenario: Unknown or linked legacy target
- **WHEN** an old policy section or retired target differs from known shipped content or is linked
- **THEN** installation refuses before profile changes and leaves the external destination untouched

#### Scenario: APPEND links in either mode
- **WHEN** APPEND_SYSTEM.md or its managed ancestry is linked in default or preservation mode
- **THEN** preflight refuses before writing regardless of whether private-stack provisioning is skipped
