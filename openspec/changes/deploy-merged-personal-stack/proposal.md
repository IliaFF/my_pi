## Why
Пользователь явно разрешил обновить установленный личный Pi и выбрал полную сборку, включая отсутствующий portable Firstmate/Herdr/browser/Python/MCP stack. Git reconciliation alone did not deploy runtime.

## What Changes
- Deploy checked merged source with the existing installer, --install-core and --preserve-settings.
- Save a separate global CLI backup and private pre-state fingerprints, plus the installer's managed-files backup.
- Use a clean committed source archive so unrelated TODO/untracked task logs and planning are not deployed.
- Verify the installed CLI, managed SDK/extensions/patches, preserved private configuration and full offline host gate.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
None. Deployment only; skip_specs: true. Existing build-governance/build-validation and portable-stack contracts apply unchanged.

## Impact
Approved personal runtime /root/.pi/agent and global npm CLI. No demo changes, cache cleanup, remote-host installation, service changes, credentials migration, fleet/MCP tool calls or paid model requests. Current Pi process requires restart after successful update.
