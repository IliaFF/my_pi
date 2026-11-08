# Evidence

## Scope and authority

Source baseline: `23abe7a4ce87318fd64bb747803718300231502d`, initially clean. Root fresh_pi TODO task `3ba6076c2aa2` owns implementation and subsequent deployment. The user authorized global installation with backup and push to origin `IliaFF/my_pi`; independently assigned pi-fold, VPS runbook and orchestrator research are excluded.

The user approved moving heavy verification to `ubercomp-host`, creating an isolated user-space Node/dependency environment, and using the remote full gate plus local full-source hash/report verification for queue evidence. No system packages, services or model settings were changed remotely. No additional paid model requests were made during implementation.

## Verified results

- OpenSpec strict validation passed.
- 21 unit/handler checks pass with network denied, including generic skill selection, byte limit, exact source lines, trust boundaries, exact explicit skill selection, metadata credential redaction, valid private rotating JSON logs, response/rule status validation, payload bounds, cancellation and one-correction budget.
- Real SDK check passes provider-context hydration, non-DeepSeek isolation, codemode nested failure/parent identity, mode switch removal, off/auto restore, compaction and post-compaction hydration, and cancellation of delayed classification during an actual model switch. Fake chat/classifier providers and empty credential store; zero network requests. This verifies SDK context, not production HTTP serialization or live model quality.
- Initial remote `npm test`: 28/29 checks passed; install-rollback failed because tar's data filter changed mode 0664 to 0644.
- Added an explicit 0664 regression; reproduced locally before the fix. Rollback now restores ordinary saved permissions while retaining archive path/link validation and dropping special bits.
- Remote `npm test`, revision r2: **29/29 PASS**, exit 0. Node 24.18.0, Python 3.12.3, Git 2.43.0. All 649 source file hashes and executable modes matched before and after the gate. Exact dependencies came from both committed lock files, without install scripts.
- Remote full report SHA256: recorded in the private compact evidence, not inferred from test stdout. Private reports: `~/.pi/prompt-tuning/remote-r2-evidence.json`; full remote results/log retained in the isolated verification directory. Raw logs, credentials and user sessions are not committed.
- `git diff --check`, shell syntax, portable installer/manifest contract and actual installer rollback regressions pass. Review findings and fixed reproductions are in `review.md`.

The r2 gate preceded final evidence/archive documentation. The archived final source must be reverified and its evidence tied to that exact complete file manifest before deployment/completion. Do not treat r2 alone as acceptance of later edits.

## Process limitations

The first model-gate regression failed before implementation. Additional hydration/security/lifecycle regressions were added during implementation/review and reproduced individual defects before their fixes, rather than all being present in the initial regression commit. No separate regression commit was made; this ordering limitation is disclosed.

Local queue npm-test preflights did not start a shell job: one was aborted, another exceeded the 10-second whole-worktree snapshot deadline on `/mnt/d`. These are not successful checks. The approved replacement is a Linux-filesystem full-source snapshot plus verification of the remote report and matching original source; preserve and explicitly supersede failed preflight history, never delete it.

No independent reviewer or inaccessible verification environment was used. The implementing agent can edit tests and reports; hash correspondence binds evidence to files but is not independent attestation. Python autopep8/Ruff were unavailable and were not installed. Existing Python style was retained for small runner/fixture edits. CI for the new commit, live provider availability, quality improvement, billing and latency remain unverified.

## Delivery

Source archive/commit and global installation are separate stages. The authoritative root TODO retains deployment, installed-source hash/startup/private-state verification, backup/rollback and push requirements until they actually succeed. Installation must use the supported preserve-settings path and skip unrelated Firstmate/paper-stack provisioning. Dependency pin comparison with the existing user runtime showed no drift before deployment. Do not update other model profiles or launch the separately assigned orchestrator comparison.
