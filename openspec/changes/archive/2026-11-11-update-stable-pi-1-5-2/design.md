## Scope and decisions
Use existing maintenance patches, exact npm lock and preservation-mode installer; add no updater/control infrastructure. Initial HEAD: 6fd6f2bbdc4b80f9db09aae5282f3a3c2a37f3f7. Existing unrelated untracked openspec/changes/archive/2026-11-08-enable-terminal-herdr-inspector/ remains untouched.

## Acceptance and influence
Cheapest first check: apply existing patches to pristine candidate packages with bounded dry-run, then inspect changed upstream contracts. Mandatory acceptance remains full npm test, followed by backed-up installation and full host gate. Do not bypass or weaken checks. The assistant can edit tests/source, so this is a procedural promise, not an independent access boundary. Stop and report incompatible candidates before runtime deployment. No live provider quality/performance claim.

## Recovery and preservation
Archive and validate the actual global core before replacement, retain installer backup and validate its restore dry-run. Compare private config/instructions hashes without reading credentials. Preserve runtime extra dependencies, package filters, sessions and unrelated files. Use --preserve-settings --install-core --skip-stack, not stock pi update --all. Restart required after successful deployment.
