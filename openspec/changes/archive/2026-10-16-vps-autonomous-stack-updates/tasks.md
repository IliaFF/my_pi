## 1. Specification and regression
- [x] 1.1 Record source/VPS pre-state, authorization, specs and design.
- [x] 1.2 Add failing acceptance/state/CI/sandbox regressions and release-pin regression.

## 2. Implementation
- [x] 2.1 Implement bounded controller, retry/resume/outbox and protected acceptance.
- [x] 2.2 Add systemd units, trusted gate and operator/deployment documentation.
- [x] 2.3 Replace historical release literals with consistent exact-pin validation.

## 3. Verification and deployment
- [x] 3.1 Pass unit tests, full npm test and OpenSpec validation; review all owned diff.
- [x] 3.2 Deploy isolated VPS runtime, separate OAuth and disabled timer units; verify sandbox/gate/Telegram.
- [x] 3.3 Verify actual subscription call and exact-SHA CI/publication guard; document that live GitHub Actions and timer activation follow archive/commit under root TODO.
- [x] 3.4 Record evidence/limits and prepare archive/commit after passing gates. Root TODO remains open until post-commit live GitHub Actions, publication and timer activation succeed.
