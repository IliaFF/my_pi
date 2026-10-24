# Hide Herdr until needed

## Why
The user wants only delegation eligibility in the standing prompt, with model catalogs, lifecycle tools and operating help loaded on demand. Source already defers all ten tools, but the installed runtime predates that change and the operating skill is still advertised on every turn. The user explicitly approved local installation with backup.

## What Changes
- Hide the Herdr operating skill from automatic prompt advertising while preserving its file and explicit command.
- Keep delegation eligibility and a short discovery pointer; move lifecycle completion prose to the existing discovered definitions/skill.
- Extend actual SDK checks to cover hidden skill metadata and absence of routing instructions through unrelated discovery.
- Deploy the approved source to the local runtime with backup and preserved unrelated personal settings, then check the installed packages.

## Capabilities
### Modified Capabilities
- `deferred-tool-loading`: Herdr help metadata stays hidden before discovery.
- `general-agent-policy`: standing delegation prose contains eligibility/safety and discovery only.

## Impact
Versioned Herdr patch/manifest, APPEND, SDK regression, documentation and approved local deployment. No child launches, paid providers, publication or history rewriting. Existing populated sessions keep their recorded schemas.
