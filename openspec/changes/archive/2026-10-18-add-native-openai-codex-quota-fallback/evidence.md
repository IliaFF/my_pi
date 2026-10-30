# Validation evidence

Baseline: `5bdf550265504673ce8cde47bdf61c76404c61bc`; clean source worktree before this change. Pi/SDK/TUI 1.3.0, @beyona/pi-zai-usage 1.1.0; no dependency/lock changes.

## Failure first
`node --require ./scripts/no-network.cjs scripts/test-native-quota-sdk.mjs npm/node_modules` on stock 1.1.0 exited 1: native model with disjoint Codex ID made 0 requests instead of 1. Artifact `/tmp/native-quota-stock-failure.log`; copy outside repo under `reports/pi-usage-install-20261018/evidence/`.

## Passing checks
- Focused actual SDK regression after patch: exit 0. Actual SDK load/dispatch and real footer rendering; only auth/HTTP synthetic.
- First full source gate failed exclusively on new patch `pinned=False`. The existing portable source was unversioned; pinned it to the already locked 1.1.0. No gate assertion weakened.
- `npm test`: exit 0, 19 checks, source package patch integration/startup included. Log `/tmp/native-quota-source-gate-2.log`.
- Final strengthened focused source regression: exit 0; includes absent source and complete actual model identity lookup assertions.
- Scoped deployment: backup `~/.pi/agent/backups/native-quota-fallback-20261018-222457/`; package index.js, codex-api.js and declarations plus changed maintenance source files only. Compared package pre-state to stock backup and maintenance pre-state to Git baseline before overwrite. Verified 15 deployed hashes and original backup payload hashes.
- Focused installed regression: exit 0.
- `npm test -- --agent "$HOME/.pi/agent"`: exit 0, 19 checks. It exercises the final strengthened test against installed packages. Host verify failures=0, warnings=2 (preserved private settings.json/mcp.json audit drift). Log `/tmp/native-quota-host-gate.log`.
- Private settings/auth/models/instructions/preferences hashes unchanged across deployment. No installation, login, native inference switch or token dump performed by this change.
- Complete owned tracked/untracked diff reviewed against clean initial state; `git diff --check` clean. Existing other-provider code is reused. The Codex auth helper now only accepts actual exact `openai-codex` providers, not native/renamed custom aliases.

## Regression coverage
Native/Codex disjoint IDs; unchanged native inference model label; native IDs containing codex do not get relabeled for auth; actual Codex source absent; missing/non-OAuth auth; configured and resolved proxy origins, HTTP and embedded credentials rejected; redirect:error; HTTP401; failure backoff; corrupt candidate recovery; logout/account change while pending; late response after other model selection and shutdown, including all-provider command; account label in both footer modes; legacy and unrelated provider behavior.

## Final archive checks
OpenSpec archive completed. Strict all-spec validation initially rejected the generated new capability Purpose placeholder; replaced it with the actual purpose. Final `openspec validate --all --strict --no-interactive`: 14 passed, 0 failed. Final focused SDK regression: source and installed package both exit 0. No runtime code changed after the successful full gates.

## Limits
No real credential/token passed to provider endpoints; saved OAuth presence was checked without reading token values into logs. No live quota, account/workspace equality, real TUI appearance or performance result established. Native-view source is Codex account quota, NOT native app allowance. User must reload/restart before new code is active. Native status events re-read rather than reuse previous numeric data, preserving failure backoff; no background poll added. Stock pi update overwrites package patches: use managed patch/verification workflow.

## Rollback
First restore any later documentation-only sync backup if needed, then restore the three original package files from `files/npm/node_modules/@beyona/pi-zai-usage/` in the deployment backup. Restore changed maintenance files from corresponding `files/maintenance/` entries; delete only newly created destinations listed with existed=false. Validate stored beforeSha256 before copying. This scoped backup format is NOT the maintenance restore-backup archive format. Settings/auth were not changed and should not be restored. Restart/reload after restore.
