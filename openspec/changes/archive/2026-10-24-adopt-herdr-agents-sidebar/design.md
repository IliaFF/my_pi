## Baseline
Clean source 0a7ba93. Explicit approval: user said to install into our build after testing. Parent root TODO task be4fcb241200. Current host has extra private packages (including pi-workspace-history) absent from portable manifest; full install.sh would replace too much and is NOT the deployment path.

## Decisions
- Add exact npm dependency/settings spec pi-herdr-agents@3.3.1. Published tarball includes sidebar files and no runtime dependencies; verify relevant package files against clean tested SHA 8864764e65a469f7d90f9a0deb39ec3f0b26befc before activation.
- Reuse the package's plugins/sidebar directory with herdr plugin link. Package lock integrity and file equality pin both components; no duplicate remote copy or new sidebar source abstraction.
- Default config enables status/sidebar and limits persistent specialists to one, without choosing model/provider, tools allowlist or automatic Focus. Fresh installer initializes this file, maintenance does not overwrite later preferences.
- Preserve-mode installer still preserves selected packages; explicitly requested live addition is done by scoped npm install and atomic settings/config merge, not whole-profile replacement.
- Extend current managed backup path set to include herdr-agents/config.json while retaining previous exact backup sets for rollback. Credentials and sessions are untouched.
- Capture private backups and file digests outside Git; verify backup before mutation. Preserve all other direct npm versions and settings fields. Runtime source maintenance only synchronized after validated source, never edited as source.
- Do not reload or restart active sessions. Already loaded sessions need /reload or a new session to gain tools; Herdr plugin actions can be registered without changing active view. No actual model task launched during adoption.

## Harness correction (skip_specs: true)
The first full gate failed context-fold SDK loading because the wrapper overwrote the isolated PI_CODING_AGENT_DIR with a path inferred from a symlinked external npm store. Preserve the explicitly supplied sandbox agent directory; keep the existing inferred fallback for standalone calls. This only corrects test environment routing, not production compaction behavior. The recorded failing full gate is the regression; the same SDK both-load-orders test must pass after the correction.

## Validation
Small regression checks for exact pin/config/bootstrap and preservation/rollback compatibility, existing installer/restoration tests, npm test, strict OpenSpec, tarball equality, actual host SDK surface/RPC startup, plugin actions and unchanged unrelated state. Report installed vs loaded explicitly.
