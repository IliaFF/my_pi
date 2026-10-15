## 1. Isolated preparation
- [x] 1.1 Inventory pinned package, SDK and existing extension/tool boundaries; preserve baseline.
- [x] 1.2 Implement minimal reproducible safety/compatibility probe with actual SDK, faux provider, bounded processes and isolated runtime.

## 2. Evaluation
- [x] 2.1 Run offline permission/budget/stop/output/tool-declaration checks, record failures and unverified claims.
- [x] 2.2 If safe, run frozen read-only live comparison through current Codex (at most four launches); otherwise document the concrete blocker and do not send live requests.
- [x] 2.3 Decide whether a small stack change is justified; preserve process-only bg_run and no automatic reviews. Decision: no global installation; retain tested quiet candidate in evidence.

## 3. Acceptance
- [x] 3.1 Full npm test, full owned diff review, evidence with scope and limits.
- [x] 3.2 Apply only justified approved changes with backup and installed-runtime verification; otherwise document no deployment. No deployment or runtime writes.
- [x] 3.3 Archive and commit portable source; update root TODO only after passing checks.
