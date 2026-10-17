# Why
VPS read-only diagnosis confirmed the installed controller matches source. The repair stopped because browser-use target 0.1.28 conflicts with protected configs/settings.json pin 0.1.26. Its valid unfinished OpenSpec then hid the blocker behind a protected-path error. The user authorized narrowly controlled pin synchronization, not arbitrary configuration edits.

# What Changes
The trusted controller prepares only exact npm pins already matching baseline dependencies in portable settings, preserving unversioned sources, selectors and all other configuration. Acceptance compares settings against the deterministic expected bytes and mode. Repair still cannot edit settings. Report a current unarchived autoupdate change as incomplete repair, without copying private model output to notifications.

# Capabilities
## New Capabilities
None.
## Modified Capabilities
- `vps-stack-updates`: controller-owned exact settings pin synchronization and truthful incomplete-repair diagnostics.

# Impact
scripts/vps-updater.py, existing offline updater tests and deployment docs. No runtime installation, VPS writes, retry reset, external repair/provider call or Git publication. No new dependencies; unchanged immutable gate and exact-SHA CI acceptance.
