# Why

Ponytail injects its base rules for active lite/full/ultra runs, but also advertises the base skill for every coding task, causing repeat reads. Review/audit instructions also prescribe English despite the session language policy.

# What Changes

Filter only the base skill from request-local skill discovery while Ponytail's base instructions are active. Keep loader resources and manual commands unchanged; restore automatic discovery in off/standalone sessions. Replace English-specific review/audit wording with session-language wording. Add a pinned-package patch and a real offline SDK regression to the mandatory gate. No production activation in this change.

# Capabilities

## New Capabilities
- `ponytail-context`: request-local deduplication and language-neutral specialized instructions.

## Modified Capabilities
- `build-validation`: mandatory real SDK coverage of modes, commands and standalone discovery.

# Impact

Ponytail 5.2.0 patch/manifest; test-build gate and SDK regression; README. No dependency additions, settings edits, web exposure or codemode mode changes.
