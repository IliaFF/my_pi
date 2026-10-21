## 1. Remove duplicate recovery path
- [x] 1.1 Capture failing filesystem-independent autocompaction regression.
- [x] 1.2 Remove packet extraction/writes/config/diagnostics and dead marker instructions; update callers/tests/docs.
- [x] 1.3 Pass focused regression and real SDK compaction lifecycle in both load orders.

## 2. Audit historical context loss
- [x] 2.1 Inspect historical compactions, kept boundaries, pre/post agreements and recovery behavior.
- [x] 2.2 Record anonymized findings with uncertainty, no private raw sessions in Git.

## 3. Validate and publish source
- [x] 3.1 Full npm test, strict specs and owned diff review; record evidence.
- [x] 3.2 Prepare publication: verify existing origin/main target and unpublished commits; actual archive/commit, final snapshot gate, push and remote HEAD evidence remain tracked in root TODO task 9fd97772bf42.
