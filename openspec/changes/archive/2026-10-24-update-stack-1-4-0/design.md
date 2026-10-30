## Context
Initial local source main e0aa04a is clean and matches fetched origin/main. Local Pi is 1.3.0; VPS PATH Pi reports 0.80.3 although its managed SDK pins are 1.3.0. Local user adds workspace-history and project scope overrides Ponytail.

## Decisions
Use exact latest stable registry versions and keep dependency membership/allowScripts unchanged. Rebase existing patches only where necessary; upstream fixes may make a patch redundant only if existing regression proves it. Install candidate dependencies with lifecycle scripts disabled, preserve personal configuration and extra dependencies, and record recoverable backups before runtime writes. Verify actual runtime entry points separately from SDK dependencies. Keep VPS automatic updater from racing deployment, restoring its prior timer state afterwards. Do not restart unrelated services or touch application data.

## Upstream probe compatibility
The initial full gate reproduces two failures before edits: stack-surface cannot register pace because its HOME fixture differs from PI_CODING_AGENT_DIR; deferred-tools-sdk compares fallback top-level tools with an undefined native tools field. Pine now uses SDK getAgentDir; core 1.4.0 anchors all initial schemas in additional_tools and replaces the internal boolean/anchorsAdditions contract with changes/additions/none and foldedSystemMessages. Update test adapters, retaining all behavioral assertions and adding explicit initial-anchor/schema checks. No production compatibility wrapper is needed.

## Validation and rollback
Use unchanged npm test, explicit host gates and project actual-SDK probe. Record tests against exact final source and deployed versions. Failed deployment restores its verified pre-state and is not reported as successful until rechecked. Source publication is explicitly authorized; no force push. Offline checks do not prove live model/service availability or rendering.
