# Evidence

## Initial state and scope

Baseline HEAD: bfd156f6a8821e80337643473c4cc08b361c44f3, clean worktree. Root tracked task: f983abeb24fe. Code scope: core reopen, queue tool schema/lifecycle, check reconstruction/freshness/supersede, README, existing three regression entrypoints; no dependencies or budget changes. Root request and factual prior audit: reports/queue-blockers-audit-20261021.md outside this Git repo.

## Red before implementation

reports/queue-recovery-fix-20261021/regression-before.log captures unit failures for absent reopenBlocked and rejected explicit preflight replacement, plus actual SDK failure rejecting that same replacement. Both unit and SDK commands exited 1. Snapshot failure fixture uses an unavailable temporary directory and asserts no job launch.

## Green and review

- Targeted 28 pure tests and actual SDK/background suite passed; log reports/queue-recovery-fix-20261021/targeted.log. Afterwards extended the existing native suite to reload and recover a historical Blocked id without an earlier ledger.
- Full mandatory npm test: 22/22 PASS, no setup errors. Snapshot-bound check 7a170191-fe92-4f23-b672-758fbcbf57ac, job b77c431ff, exit0, observed via checks before changing files. Results copied outside source to reports/queue-recovery-fix-20261021/pre-archive-results.json.
- Initial check attempt 91265a56-9aea-4bfa-b78d-d4b28ba18f49 aborted before job creation; rerun used identical npm test/cwd, not a different obligation. Its history was retained.
- git diff --check and openspec validate repair-queue-blocked-and-preflight-recovery --strict --no-interactive passed. Reviewed complete owned source, tests, docs and new change artifacts. The final merged-spec snapshot needs another identical recorded npm test after archive; pre-archive results do not prove that later snapshot.

Native tests cover prelaunch error without shell, explicit cross-cwd replacement, missing obsolete directory at complete, launched failure/unknown/running rejection, stable/fresh/task/latest/chain guards, unique Blocked reopen with Pending order retained, no completion from old PASS, fresh recorded-check requirement, append-only records, resource reload and historical task with no old check ledger. Global branch limit still counts all lifecycles.

## Installation and root recovery boundary

User separately approved scoped installation with backup through structured question. No install or root Blocked mutation has occurred at the time of this pre-archive evidence. After final PASS/commit, update only owned queue and corresponding maintenance source files with baseline/backup hashes, then validate installed dependencies read-only. Current live process is not proof of reload; require restart/reload to pick up the new tool schema.

Root recovery is sequential and explicit, only when the main task is completed: reopen old id, start a fresh meaningful check, await native terminal/follow-up, observe stable exit0, complete matching id. Re-run full gate/report identity for 9fd97772bf42; re-run all six offline history scenarios for dc567e4ccd82. No transfer of previous sessions' checks or manual edits to root TODO. Pending classifiers remain untouched. Append installation, final gate, recovery results and hashes to the external report, not a false claim of already executed work here.

## Limits

No live provider, SSH, browser/TUI interaction, latency or quality evidence. Offline Node network guards are not an OS sandbox. Supersession requires a human-readable coverage reason, not a proof that arbitrary commands are equivalent. No push. Snapshot bounds are retained, not expanded to recursively scan an arbitrary huge root. Legacy history stays intact.
