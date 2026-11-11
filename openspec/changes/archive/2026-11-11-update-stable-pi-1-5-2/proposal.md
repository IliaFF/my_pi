## Why
User explicitly requested updating Pi and extensions and selected latest stable releases with compatibility checks and backed-up installation.

## What Changes
- Align core/TUI to 1.5.2 and changed direct dependencies to npm latest stable; preserve package inventory and unrelated settings.
- Rebase version-gated patches only where required and retain all behavioral checks.
- Validate source, then install Pi-only preserving private state with recovery backups and run the full installed gate.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
None; dependency alignment under existing build-validation, build-governance, portable-user-stack and deferred-tool-loading contracts. skip_specs: true.

## Impact
Exact npm pins/lock, manifest, versioned patches and current-baseline documentation; approved local CLI and user runtime. No SSH, services, independent Firstmate/MCP deployment, paid model calls or publication. Existing project Ponytail override must be inspected separately; unchanged latest version does not require reinstall.
