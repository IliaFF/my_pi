# Evidence

## Scope and baseline

Root task:764ebe3ac3aa. Initial pi-build HEAD:27ae248b8183876cb5ecada1d1dc0d9de3d7c02d; tracked/untracked status clean. No production deployment, settings/auth changes, paid requests, Jev or agent subprocesses. Root TODO remains authoritative through final archive validation and commit.

Implemented one optional queue workflow: check/checks use actual native nested bg_run/bg_status, task id/text and real job identity/exit status; complete compares pre-run/terminal-observation/current fingerprints. Direct-evidence-only tasks remain compatible. Async TODO mutations retain byte conflict checks and cannot steal an old-mtime lock from a live process. Installer plus managed-file manifest include checks.ts.

## Regression and validation

- Initial node --test scripts/test-queue-checks.mjs: exit1, missing checks.ts before implementation. Log: ../reports/queue-check-snapshots-before.log.
- Review regression for a tracked path under an ignored symlink ancestor: exit1, Missing expected rejection before canonical-path fix. Log: ../reports/queue-check-snapshots-links-before.log. Fixed by rejecting noncanonical file paths; content hashing now streams with deadline/byte bounds.
- Pure tests:5/5 PASS. Git tracked/untracked content/add/delete/mode, TODO bookkeeping exclusion, non-Git/cache/background-output exclusion, unknown scope, symlinks/ancestor symlinks, oversized input, freshness/actual exit/unknown/pending/task ownership, explicit rerun and async lock/concurrent edit cases.
- Actual SDK plus patched bg package: PASS with faux provider and no network. Native nested calls cover running rejection, changes during/after check, printed PASS with exit7 rejection, wrong task id, lifecycle release/reclaim invalidation and final successful completion. Workers have5s deadlines; terminal events awaited, no polling.
- First full gate was deliberately killed after review identified the symlink-ancestor edge case; not acceptance evidence. Next full gate found installed RPC startup missing checks.ts from managedConfigs: FAIL, corrected manifest. Log: ../reports/queue-check-snapshots-npm-test-final.log.
- Final packaged-source gate: npm test exit0,18/18 stages PASS, including pure checks, actual queue/check/background SDK, existing regressions and installed RPC startup. Log: ../reports/queue-check-snapshots-npm-test-packaged.log; JSON: test-results/results.json (generated, not committed).
- openspec validate queue-check-snapshots --strict --no-interactive: PASS. git diff --check: PASS. Owned tracked and new source/tests/docs reviewed; final staged/archive validation is recorded in root task completion.

## Limits

Git scope includes tracked and nonignored untracked files; ignored inputs, dependencies/environment/external services are not certified. Non-Git scope excludes named dependency/cache/output directories. TODO lock/temp and .pi/tasks are excluded.50k files/256MiB/10s per snapshot;100 records per branch. Unsupported links/submodules and observation failures fail closed. A temporary edit restored between observations, concurrent writes after final comparison, adequacy of the chosen test, deliberate direct-TODO bypass and live provider/service quality are not proven. Terminal snapshot is taken on explicit inspection, not a timer. CI and personal runtime activation were not run.
