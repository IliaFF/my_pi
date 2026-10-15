## 1. Define and isolate
- [x] 1.1 Source inspection/spec/design; isolated pinned install, retained versions unchanged, no active changes.
- [x] 1.2 Offline real SDK acceptance regression; show unsafe upstream defaults before enforcing process-only policy.
## 2. Implement and verify
- [x] 2.1 Minimal shared admission/default/surface package patch, callers/schema/docs aligned; no agent/wake/provider lane.
- [x] 2.2 Success/failure/timeout/tree-cancel/log cap/reload/restart checks and source full gate/release replay PASS.
## 3. Approved activation
- [x] 3.1 Verified backup then runtime pin/filter/patch; private config preserved; host+maintenance gates PASS.
- [x] 3.2 Review complete diff, write evidence/limits, verify maintenance and prepare for archive/local commit after all checks.
