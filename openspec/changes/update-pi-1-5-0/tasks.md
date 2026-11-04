## 1. Candidate
- [x] Read source/update contracts, record clean initial state, fetch and fast-forward origin.
- [x] Obtain explicit approval for 1.5.0 migration, browser retirement and push.
- [x] Align exact core/tui pins, lock, installer and current documentation.
- [x] Install candidate dependencies and inspect 1.5.0 changes; preserve existing tests.
## 2. Verification and deployment
- [x] Pass full source npm test; resolve only reproduced compatibility issues.
- [x] Back up global core and private runtime, deploy with preserve-settings and skip-stack.
- [x] Pass full host gate and verify private state, browser retirement and actual CLI/SDK versions. Guarded payload cleanup refused missing marker; user explicitly accepted retained on-disk files.
## 3. Delivery
- [x] Review full owned diff/new files and record evidence and limitations.
- [ ] Archive successful change, validate, commit and push; verify remote SHA.
