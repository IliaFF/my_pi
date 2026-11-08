## 1. Contract and initial state
- [x] Read current root TODO and pi-build instructions; user authorized pausing pi-fold, installing globally and pushing to my_pi.
- [x] Record clean source baseline 23abe7a, verify origin targets my_pi, read relevant specs and full extension API documentation/examples.
- [x] Write proposal, design, specs and checks, including codemode priority and private diagnostics.
- [x] Validate OpenSpec change (`openspec validate deepseek-workflow-assistance --strict --no-interactive`, exit 0).

## 2. Regression and implementation
- [x] Add failing model-gate regression before implementation and generic hydration regressions during implementation; the initial ordering limitation is explicitly recorded in evidence.md.
- [x] Extend the existing review owner with auto/on/off, cancellation/branch/compaction behavior.
- [x] Add catalog-driven full skill loading, bounded trusted retrieval and explicit omissions.
- [x] Add DeepSeek-scoped codemode guidance without permission/tool-list changes.
- [x] Add evidence-based rule statuses and preserve safe one-correction behavior.
- [x] Add private bounded metadata diagnostics with parent-linked tool outcomes.
- [x] Restore managed installation and mandatory test integration; update portable docs.

### Current local evidence (not acceptance completion)
- `node local-extensions/jev-review/check.mjs`: 21 checks pass after fixing the import-only SDK alias in the test loader. `git diff --check` passes (whitespace only, not full review).
- Added regression for exact source lines across multiple blank lines: failed with line 3 instead of 5, now passes.
- Added arbitrary-catalog hydration/full-section byte-budget regression: failed at 98,728 bytes against 98,304 limit, now passes. Budget includes headers, retrieval and bounded omission metadata; loaded bodies remain complete.
- Added untrusted ancestor-project skill regression: initially loaded one unsafe skill, now rejects using SDK source scope as well as cwd containment. Explicit disabled skills now respect an exact `/skill:name`, without prefix matching; covered by a separate check.
- Real SDK check now passes non-DeepSeek isolation, complete arbitrary skill hydration in provider context, final-settle classifier, real codemode nested failure with parent linkage, model-switch removal and explicit off/auto restore. Zero network attempts. SDK regressions exposed and fixed use of `context` instead of `context_with_system` and an incorrect assumption that the first system message is always at index zero.
- Installer/manifest contract regression initially failed on missing managed extension entries; now passes after restoring managed deployment. Unit and SDK checks are included in the mandatory runner. Installer shell syntax and diff whitespace checks pass.
- Python formatter/linter unavailable in the current environment (`python3 -m autopep8` and `python3 -m ruff`: module not found); not installed or substituted. Runner integration and a one-line explicit permission fixture were added; full Python test gate remains required.
- Real SDK additionally passes native compaction without a Jev request, post-compaction hydration, and delayed routing cancellation on an actual model switch. Ordinary SDK summary calls use the fake chat provider; the workflow adds no compaction-time call.
- Privacy regressions: redacting serialized JSON broke log syntax for token query parameters; now metadata strings/keys are redacted before JSON serialization. Catalog descriptions now redact known credentials before classification. Tests cover owner-only modes and rotation. Both defects were reproduced before their fixes.
- Authorized remote verification: isolated Node 24.18.0 and lock-file dependencies on `ubercomp-host`, under `/home/ubercomp/pi-build-verification/deepseek-3ba6076c2aa2-20261108`. Initial copy matched all 649 source files by SHA256 and executable modes. First full gate: 28/29 passed; install-rollback exposed loss of 0664 permissions after Python tar data filtering. Explicit fixture reproduces locally; restoring ordinary saved file modes fixes it while retaining path/link validation and stripping special bits. Remote gate must be repeated on updated source.
- Local task_queue preflight never launched npm: aborted once, then snapshot deadline exceeded. These records are not passing checks and are not bypassed by remote evidence. Completion still requires resolving the recorded gate contract.
- No new paid requests, global installation or push. Source review and final validation/delivery remain outstanding.

## 3. Validation and delivery
- [x] Run real offline SDK/provider-context/codemode regressions, including failure and stale-work cases. Fake providers exercise actual SDK context, not a live HTTP provider payload.
- [x] Run full npm test and review complete owned diff against the clean baseline; resolve findings. Remote r2: 29/29 PASS; review.md records findings and limitations.
- [x] Record source evidence and prepare archive; final archived-source verification and commit are delivery steps retained in the root TODO.

## 4. Delivery tracking (root TODO remains authoritative)
Source archive does not complete root task 3ba6076c2aa2. Remaining mandatory steps: revalidate the complete archived source with the remote gate and approved local hash/report check; commit owned source; back up and install via supported preserve-settings path; verify installed source/startup/private-state preservation; push verified source to origin/my_pi and verify remote HEAD. Record the backup/rollback path and remaining limitations before completing the root task.
