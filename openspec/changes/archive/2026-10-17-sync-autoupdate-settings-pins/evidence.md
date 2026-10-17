# Evidence

## Baseline and diagnosis
- Local source began clean at f08ad47; installed VPS controller and local scripts/vps-updater.py had identical SHA256 1f60fdbae79d8676a433532b5684554c04fadeb2cbb64164a6cab8a6091691cb.
- Read-only inspection of the private 20261017T033001Z agent log confirmed an intentional stop: protected browser-use settings pin 0.1.26 conflicts with target 0.1.28, full tests failed and patch migration remained incomplete. No model log or credentials are included here.
- The leftover active OpenSpec metadata masked that blocker with a generic scope error. Attempt count was one; no reset or retry occurred during source repair.
- User separately approved controller-owned exact pin synchronization, preserving all other configuration and acceptance protections. Later approval to deploy/retry is tracked separately from this source validation.

## Regression and checks
- Before implementation: python3 -B -m unittest tests.vps_updater_test, exit 1, 28 tests, 2 failures and 3 errors. Existing code accepted unrelated settings in pin validation and emitted the misleading protected-path diagnostic; synchronization/preparation was absent. reports/autoupdate-settings-pins/regression-before.log is local evidence outside Git.
- After implementation: same updater suite, exit 0, 28 tests. One intermediate test-fixture correction changed the executable-mode tampering test to invert the actual source mode (WSL mount reports executable bits unlike Git). Production behavior was not weakened.
- Additional actual-baseline self-check: all four existing exact declarations (train-agents, browser-use, ssh-remote, background-tasks) synchronize; floating declarations, selectors and unrelated settings stay unchanged.
- npm test, exit 0: all 18 contract/unit/integration/smoke stages PASS. Includes unchanged real SDK, patch verification and RPC startup; provider/OAuth/systemd/publication boundaries are mocked in updater-specific tests. Log: reports/autoupdate-settings-pins/full-gate.log (local, outside Git).
- Complete owned diff reviewed against initial clean state, including new OpenSpec artifacts. git diff --check PASS. Only controller, updater tests, deployment docs and this OpenSpec change are owned.

## Final-scope follow-up
- Two local post-archive full runs passed the first 17 stages but RPC startup timed out waiting for get_state, with empty stderr. Local RAM and swap were near exhaustion; this is a possible environmental cause, not a proven attribution. No timeout was changed.
- Isolated clean-lock VPS test-UID validation passed RPC startup and every stage except queue-checks: its existing 257 MiB sparse fixture exceeded the unchanged 64 MiB sandbox file limit (EFBIG). This requires the separate fit-queue-fixture-to-vps-file-limit change, not a weaker sandbox. The stage is isolated from OAuth and working runtime.

- After the separate fixture correction: full clean-lock VPS test-UID gate passed all 18 stages with the original resource limits; no working-runtime/controller/timer writes. See fit-queue-fixture-to-vps-file-limit evidence for exact source archive and private host log.

## Limits
No paid/provider repair, working-runtime changes, timer changes, publication or live new-release acceptance was performed during source validation. Hosted CI for this change is not run. Passing offline tests does not prove future migrations or live availability. Existing active-change rejection, protected config/test/controller policy outside exact prepared pins, gate and exact-SHA CI remain mandatory. Deployment/retry needs its own backup and result evidence.
