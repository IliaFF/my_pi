# Evidence

## Baseline and agreement
Source HEAD 713b859; tracked diff initially empty. Pre-existing untracked archive `2026-11-08-enable-terminal-herdr-inspector` is excluded from ownership and its initial file hashes are retained locally for comparison. User chose removal of the leftover spec requirement, not restoration of the delegation paragraph. Exact known legacy migration after backup is authorized; unknown modifications and links must refuse. Production, SSH, installations, paid calls and push are outside scope.

## Regression
Before implementation: `node --test scripts/test-install-migrations.mjs` exit 1, 13 tests: 1 PASS / 12 FAIL. Failures reproduce linked APPEND in both modes, linked profile parent, missing migration/rollback, unknown target admission, private APPEND snapshot and orphan settings. Historical fixture hashes matched from the beginning. Raw bounded test logs are local artifacts, not committed runtime data.

After implementation: same regression plus modified-heading case exit 0, 14/14 PASS. Actual backup block and uninstall CLI restore runner/Jev file bytes and APPEND; private sibling files survive. CRLF private instructions survive exact section removal, second migration is byte-identical. Unknown changes, linked targets/ancestor and FIFO fail before mutation. Actual APPEND manifest entry no longer captures private policy.

Focused retained checks: installer restore unittest 15/15 PASS; portable-stack and no-agent-runners PASS. `autopep8 2.3.2` and `ruff 0.16.10` were found in existing local uv cache, no installation needed; formatting and `ruff check tests/installer_restore_test.py` PASS. Bash/Node syntax checks and git diff --check PASS. Strict OpenSpec validation before full gate: 26/26 PASS.

## Full gate
`OPENSPEC_TELEMETRY=0 npm test`: PASS, exit 0, all 28 stages; background job bcc98f875. Includes real harness/install-rollback, migration through portable-stack, actual SDK/patch verification and RPC startup. `test-results/results.json` reports passed:true, 28 checks, no failures or setup errors. No tested source files were modified while this job ran.

Main specs were synchronized from reviewed deltas before regression. Archive uses --skip-specs solely to avoid reapplying the already synchronized deltas, never --no-validate. Strict validation remains enabled. The archived scope receives another full npm test before commit; its actual result/job ID is recorded in the commit message and authoritative root TODO, not predicted here.

## Review
Reviewed complete owned tracked diff, new helper/tests, historical migration registry/fixture data and change documents. Registry provenance was independently checked against every declared Git revision: all section texts and every registered SHA-256 match historical source. No dependencies were added or updated. Pre-existing untracked archive file hashes remain unchanged. Source-only APPEND remains unchanged, and no delegation paragraph is restored. Python test formatting/Ruff and syntax/whitespace checks passed.

## Limits
No production profile was read by regression fixtures or changed. No dependency updates, SSH connections, provider/MCP/fleet calls, package installation or push. CLI/network/live quality, performance and CI job are unverified. Installer checks are not an OS sandbox or a lock against concurrent external writers; do not run installations concurrently. Only registered historical variants migrate automatically; unknown/custom legacy requires manual review.
