## Why
The user requests updating Pi and every installed extension, testing, publishing to IliaFF/my_pi and installing locally and on the VPS. Stable registry discovery finds core 1.4.0 and newer extensions. Existing patches and private configuration must survive.

## What Changes
- Align exact portable core/TUI and extension pins, lock and version-gated patches to latest stable releases.
- Validate source with the unchanged mandatory offline gate; preserve local extra workspace-history and project Ponytail override.
- Back up and deploy approved source/runtime changes locally and on VPS, verify host gates, archive and publish the tested commit.

## Capabilities
### Modified Capabilities
- build-governance: checked stable updates cover approved local and VPS runtime, including active overrides.
- build-validation: align actual upstream lifecycle/payload probes and post-update baseline acceptance.
- deferred-tool-loading: carry Preview deferred exposure to the new stable release.

## Impact
Dependency declarations/lock, manifest, installer core pin, patch metadata and documentation; backed-up private runtime installations. No new dependencies, features, paid requests, credential changes or unrelated VPS application changes. Version-only changes use existing real SDK regressions; any discovered behavioral bug requires a failing regression first.
