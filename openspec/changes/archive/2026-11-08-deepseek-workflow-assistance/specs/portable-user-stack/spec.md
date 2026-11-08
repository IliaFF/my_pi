## ADDED Requirements

### Requirement: Workflow assistance is a managed source-owned extension
The installer MUST deploy the source-owned workflow reviewer/hydrator with DeepSeek-only automatic defaults and preserve unrelated user configuration, credentials and sessions. Backup and rollback MUST cover the deployed extension. Private diagnostic logs and research sessions MUST NOT enter Git.

#### Scenario: Authorized global deployment
- **WHEN** the validated source candidate is installed globally
- **THEN** the managed extension files match source, unrelated private state remains intact, and the prior extension/runtime state is recoverable from backup

#### Scenario: Existing group-writable configuration
- **WHEN** installation fails and an existing managed configuration had mode 0664
- **THEN** rollback restores its original bytes and ordinary permission bits, without restoring special setuid/setgid bits or weakening archive path/link validation
