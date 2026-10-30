# Evidence

## Scope and baseline
- Initial `pi-build` main was clean at bb45c1a, synchronized with origin/main. Root fresh_pi TODO is authoritative; task 1b1b7547cdeb.
- Removed only Canary dependency/lock entry, activation, managed config and patch. Preserved auto-ultra-compact's 500000-token threshold and native reserve settings without changing extension code.
- Replaced Canary-specific SDK scenarios with a direct-response/no-recall-probe test and retained native smaller-window deterministic compaction coverage. Existing auto-ultra regression covers exact 500k boundary, continuation/error/session lifecycle and both summary-owner load orders.
- Historical archives remain unchanged. Installed runtime, personal settings and production files were not changed.

## Regression and targeted checks
- Before removing Canary, `python3 scripts/test-release.py` exited 1 with `FAIL Canary must be absent from the release` under the new absence assertion.
- Strict change validation PASS. Removed the former requirement explicitly and added a Canary-free replacement because retaining obsolete recall-failure scenarios would misstate the requested behavior.
- `node --require ./scripts/no-network.cjs scripts/test-compaction-sdk.mjs npm/node_modules`: PASS (real SDK, faux provider, direct answer without a probe, native smaller-window deterministic compaction, temporary session artifacts).
- autopep8 and Ruff unavailable (`No module named autopep8` / `ruff`); no tools installed or unrelated Python formatting performed.
- Full owned tracked diff and new SDK/spec/change files reviewed; no unrelated initial changes existed. `git diff --check`: PASS.

## Dependency preparation
The repository npm/node_modules was a symlink. `npm prune --ignore-scripts --legacy-peer-deps --prefix npm --no-audit --no-fund` removed the link and started building an isolated repository dependency tree but exceeded the 60-second foreground deadline. A clean `npm ci --ignore-scripts --legacy-peer-deps --prefix npm --no-audit --no-fund` was then launched in the background. The symlink target (installed runtime) was not modified.

## Limits
No live provider, interactive TUI, installed-runtime deployment or GitHub CI validation. Offline SDK checks do not establish live service availability, recall quality, cost or performance.

## Full gate retry
- Repository dependency installation b3ad17af8 completed, exit 0.
- First two queue-check preflights were aborted before any job launch (records have no before fingerprint/jobId); warming the Git source files allowed the next snapshot to succeed without narrowing scope.
- Full `npm test`, queue check 6f9f0181-ad0e-469d-9d1f-10844e9b4ee5 / job bdd6e16f4, exceeded 600s. The harness future-pin fixture, release gate, context-fold subprocess, compaction SDK and deferred-tools SDK hit their existing time limits. Other completed stages passed. No assertions demonstrated a behavior regression.
- Unlike the original Linux-backed symlink, the newly installed repository dependency tree was on slow /mnt/d. Move only these ignored test dependencies to a temporary Linux directory and restore an ignored node_modules symlink; keep the same Git scope, test command and per-stage limits. This is a test-I/O remedy, not a snapshot scope workaround or an installed-runtime change.
- Cross-filesystem `mv` of the large ignored dependency tree also exceeded its 900s deadline (job b54df099f), leaving both source and temporary destination directories. No source release files were moved. Instead, install the unchanged lock directly in the temporary Linux directory with npm ci; retain the original dependency tree under ignored npm/local-deps-backup/node_modules and point the repository node_modules link only at the new isolated test tree.

## Passing gate and final review
- Linux dependency setup b7cf50e9e: exit 0. Dependencies remain isolated from the installed runtime.
- Full `npm test` check 5ca907f6-0a22-4740-8793-850717d0e5ec / job bf18512fc: exit 0, all 23 stages passed, including 88 harness tests, strict OpenSpec, release structure, real compaction SDK, patch application/verification and RPC startup. No test limits were weakened.
- Reviewed every changed tracked file plus the new SDK test and change artifacts against clean bb45c1a. The extension cap and native settings are unchanged; removed Canary-only SDK branches intentionally have no replacement because Canary no longer ships. The direct-response and smaller-window scenarios remain exercised by the real SDK.
- Final archive validation is recorded by the same authoritative queue task. Commit/push publication follows the successful final check; GitHub CI is not claimed.
