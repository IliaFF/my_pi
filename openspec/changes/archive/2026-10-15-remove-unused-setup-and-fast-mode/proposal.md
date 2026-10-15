# Remove four user-selected packages

## Why
User explicitly requested removal of pi-my-setup, @tunnckocore/pi-gpt-fast-mode, @llblab/pi-telegram and pi-diff-review, plus local reader-pane.ts. Source must match the installed configuration so reinstall does not restore them.

## What Changes
Remove reader source/test/installer wiring/manifest/README and startup command expectations; retain exact retired-reader rollback destination. Remove four settings declarations, direct dependency pins, lock entries/dependency-only transitives and README rows. Use Pi package removal for approved runtime, backup first. Preserve credentials, sessions, custom settings, bot data and all other direct package versions. Reload needed to unload already active Telegram and /fast hooks. No publish or paid/live API calls.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- build-governance: explicitly approved removal of selected optional packages across source/runtime.

## Impact
Source configs/settings.json, npm/package.json/lock and README. Installed settings/npm tree and maintenance source mirror. Telegram messaging/control/apps skills and /fast disappear after reload. Saved configurations remain recoverable.
