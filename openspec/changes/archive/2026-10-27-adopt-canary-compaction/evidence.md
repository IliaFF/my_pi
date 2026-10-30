# Evidence: Canary compaction and model-safe 500k cap

## Authorization and boundaries
The user selected task b2317f0eab2f and explicitly authorized installing Pi Canary and changing compaction. Clarification approved a 500000 target with native smaller-window protection and compaction after three consecutive recall failures. Task 7fd337985efd was deleted as requested; the other pending task stayed pending. No VPN/server work, provider/model changes, credentials, production-wide reinstall, publishing or paid model calls.

## Implementation and regression
- Pin pi-canary 1.5.0; the downloaded registry tarball SHA-512 matched the exact npm lock integrity. No other source dependency changed.
- COUNT=3, POSITION=equidistant, VARIANT=fixed, FAIL_COMPACT=3, managed through manifest/config snapshot.
- Stock Canary failed real SDK regression: `Original request did not resume: failure 3`. Patch resumes only after compact completion/error, skips hidden re-verification, preserves the original prompt, ignores stale callbacks after session replacement, and removes obsolete marker-return instructions.
- Real SDK also exposed a timestamp collision: filtering verification output by timestamp alone could remove a user message in the same millisecond. Patch scopes the filter to assistant responses; a collision regression preserves the user input.
- Raise both local extension constants 170000 -> 500000. Unit boundary tests cover 170000, 499999 and 500000. Native compaction remains enabled with reserveTokens=12500, keepRecentTokens=12000. An actual smaller-window SDK fixture compacts below 500k. Reported 510k verification usage is exercised with Canary success/failure without extra real-answer turns.
- context-fold remains the sole deterministic summary owner; manual user compaction retains its non-continuing behavior.

## Failed gate, root cause and resolution
Initial full gate b62298837 exited 1: unit/harness and unit/release found forbidden `context-fold/<synthetic-session>/seed-index.jsonl` in the source tree. The new SDK fixture used SessionManager.inMemory(), whose session directory is empty; context-fold consequently wrote relative to process cwd despite a temporary SDK cwd. A directory assertion reproduced the issue (`actual ''`, expected a temporary sessions path). Changed the fixture to SessionManager.create(temp, explicitTemporarySessionsDir). Existing synthetic spill files were moved outside the repository, not exempted from the strict release scan. The fixed test leaves no source context-fold directory.

## Passing validation
- `npm test`: background b1c557ed6, exit 0, 23/23 stages including OpenSpec, 88 unit harness tests, release validation, real SDK integrations, all patches and RPC startup.
- Installed runtime `npm test -- --agent <agentDir>`: background b74560ee8, exit 0, 23/23 stages including host-drift, patch verification, Canary SDK and fresh RPC startup.
- Real SDK Canary tests use fauxProvider, InMemoryCredentialStore and the existing no-network guard. They cover normal verification, exactly three failures, deterministic summary, cancelled-compaction continuation, no verification-loop continuation, native smaller-window protection, stale callbacks and timestamp collision.
- Maintenance verify: failures=0, warnings=2. Warnings are audit-only personal settings.json/mcp.json snapshot drift; these were preserved, not normalized.
- `git diff --check` and strict OpenSpec validation passed before archival. Owned tracked and untracked source diff was reviewed; initial source worktree was clean.
- autopep8/Ruff are not installed; their version probes failed. No tool installation or broad reformatting was performed. Python changes are limited to release assertions and registering the new SDK test; they ran in the mandatory gate.

## Targeted deployment and rollback
Production installation copied only the owned extension, the exact Canary package/patch/config, and the necessary maintained source files. Active and maintenance package metadata were merged, not replaced; self-checks verified that every unrelated dependency/lock entry and personal setting remained unchanged. In particular, the existing pi-workspace-history dependency was preserved. Core and every other installed package stayed unchanged.

A private targeted backup was created at `~/.pi/my-pi-backups/canary-LhgqCD`, containing original owned paths and `owned-paths.json` with existence flags. This is NOT an install.sh or maintenance restore-backup archive. For a rollback, review current drift first, restore only listed pre-existing files from that backup and remove only listed originally absent Canary paths; never replace the whole npm tree or personal settings without checking subsequent changes. Then repeat the host gate and restart Pi. No rollback was needed.

## Limits
File installation plus fresh-process tests do not hot-reload this running conversation: /reload or restart is required. Marker recall is not proof of answer quality, and offline faux tests do not measure live recall degradation, billing, latency or cache efficiency. Distributed markers may invalidate prefix cache. No CI job, remote push, live provider or interactive TUI test was performed. SDK model metadata reported 272000 for openai/gpt-6.1-sol and 500000 for openai-codex/gpt-6.1-sol; these are local catalog values, not a live provider verification. Native reserve protection therefore intentionally acts before 500000 on either of those windows.
