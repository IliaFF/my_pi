## Why
User approved updating installed Pi and the build to stable 1.5.0, integrating origin/main 68ab8d8 including browser retirement, and committing/pushing successful results.

## What Changes
- Move core and pi-tui exact pins from 1.4.0 to 1.5.0; retain other direct dependencies.
- Adapt patches/callers only if actual SDK regressions require it.
- Run the mandatory offline source gate, install Pi-only with backup and preservation, and run the host gate.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
None; version alignment and approved deployment only. skip_specs: true. Existing build-validation, build-governance and portable-user-stack contracts remain unchanged.

## Impact
Exact npm lock, manifest, installer and current-baseline documentation; approved ~/.pi/agent and global CLI. No SSH, full-stack bootstrap, live provider/MCP calls, service restart or changes to independent projects. Browser retirement is explicitly approved; private data must survive.
