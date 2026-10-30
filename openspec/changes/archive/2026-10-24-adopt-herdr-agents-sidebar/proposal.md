## Why
The user explicitly approves installing Herdr agents and sidebar after the isolated real-spawn/render checks passed. Adopt the tested package without replacing private runtime settings or restarting the current Herdr/Pi sessions.

## What Changes
- Pin pi-herdr-agents 3.3.1 in portable dependencies/lock/settings and initialize a conservative sidebar-enabled agent config only when absent.
- Back up runtime npm/settings/config and Herdr plugin registry before targeted installation. Preserve unrelated packages and private provider/settings/instructions.
- Link the sidebar shipped in the exact npm package after verifying its files match the tested Git revision. No second floating remote install.
- Verify source/host loading and plugin actions without invoking Focus/All or paid model requests; document reload and rollback.

## Capabilities
### New Capabilities
- `herdr-agents-adoption`: pinned package/sidebar activation with scoped backups and explicit lifecycle limits.
### Modified Capabilities
None. Managed multi-window threshold, native sequential handoff and shell-only background restrictions remain unchanged.

## Impact
Portable npm/settings/config/installer backup paths, rollback allowlist compatibility, tests, deployment docs and an approved scoped live installation. No core update, custom orchestrator, current-session restart, external model calls or push.
