# Why

Reloading an old session after terminal installation hides the new eager subagent tool: the deferred loadout restorer mistakes an unseen direct tool for a previously removed discovery tool. Fresh startup acceptance did not cover this migration.

# What Changes

Preserve the new eager subagent when no declaration/removal for that name exists in the reopened branch. Continue respecting explicit recorded removals and existing deferred loadouts. Add failing real SDK regression before implementation.

# Capabilities

## Modified Capabilities
- `deferred-tool-loading`: newly installed eager terminal remains available after reopening old sessions.

# Impact

Only deferred-tools loadout restoration, SDK regression and metadata. No provider calls in mandatory tests. Operator separately authorized one bounded live terminal sentinel after offline acceptance; this does not authorize general live testing or weaken delegation policy.
