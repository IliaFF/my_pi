## Why
The user explicitly changed deployment scope to Pi only after the optional private Playwright Chromium download reached only 40% in ten minutes. Existing Pi updates must not require provisioning a separate Firstmate/MCP/browser environment.

## What Changes
- Add explicit install.sh --skip-stack while preserving the default complete-stack behavior.
- Skip only private-stack prerequisites/bootstrap and do not add missing private Jev/paper MCP launchers in this mode.
- Preserve existing MCP entries, managed Pi updates, backup/rollback and all mandatory tests.

## Capabilities
### Modified Capabilities
- `portable-user-stack`: explicit Pi-only installation.

## Impact
install.sh, installer configuration tests and portable installation docs. No deletion of shared browser caches, independent projects or existing MCP servers. No changes to browser or core versions. No paid calls or services.
