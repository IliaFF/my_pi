## Why
User explicitly approved updating the installed Pi and full portable Firstmate/Herdr stack from the remote repository, not just fetching Git.

## What Changes
- Merge origin/main fb29d73 without discarding local Windows/rollback fixes or unrelated working changes.
- Deploy a clean committed archive using install.sh --install-core --preserve-settings with a private pre-state backup.
- Run the full source and installed host offline gates and verify private configuration and portable stack integrity.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
None. Deployment only; skip_specs: true. Existing build-governance, build-validation and portable-user-stack contracts remain unchanged.

## Impact
Only the approved local runtime and managed portable stack. No remote machine update, demo changes, services restart, fleet launch, live MCP/provider calls, Canary or context tuning. Incoming extension updates: browser-use 0.1.33, preview 0.26.2, web-access 0.46.0. Core remains 1.4.0; portable stack pins remain unchanged.
