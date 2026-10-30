# Verification evidence

## Baseline and authorization
Source baseline 04f503818ce8a29ce0f79adb0cd210d276db28db; initially clean worktree. Local and global OpenSpec 1.14.1. npm registry latest and GitHub release both confirmed 1.14.3. The user approved the tooling/CLI update, then publication and merging origin/main 5c84fe2 with local 04f5038.

## Update and audit
- Exact source dependency and npm lock now select @fission-ai/openspec 1.14.3; lifecycle scripts disabled during installation.
- Tooling npm audit: exit 0, 0 vulnerabilities (previous documented tree had 4 high). Removed fast-glob/braces dependency chain; reviewed every changed lock entry. No audit fix or forced downgrade.
- Global CLI install: npm install -g --ignore-scripts @fission-ai/openspec@1.14.3, exit 0; openspec --version and npm ls -g both confirm 1.14.3. Local/global direct dependency requirements match.
- Global backup: ~/.pi/backups/openspec-20261019T162630Z/openspec, verified package version 1.14.1; original destination recorded alongside it. Restore that directory to the recorded destination to roll back; bin symlink target is unchanged.
- Global strict validation before merge: 15 passed, 0 failed.

## Pre-merge gate
Queue check 17860aaf-c7fb-4e6c-8d39-1e10dc7ada82 / job b10894f98, exit 0: npm test (19/19 checks), local strict validation (15 passed, 0 failed), git diff --check. Existing real SDK integration, patch checks and RPC startup passed. This result covers only the pre-merge tree, not the subsequently approved upstream merge.

## Publication integration
origin/main 5c84fe2 updates pine-of-glass 0.18.0 → 0.18.1 and adds its archived change. Merge applied without conflicts, preserving the local native quota fix. Source dependency installation is repeated with scripts disabled. The first synchronous npm ci exceeded its 60-second command deadline; it was retried as a bounded background job. The retried install completed successfully (405 packages, audit 0). The first merged-tree gate (job bab022225) exceeded 600 seconds: the harness future-pin regression exceeded its existing 30-second deadline and several SDK checks also timed out; no assertion mismatch was reported by those timeouts. Diagnosis found npm ci had replaced the original runtime dependency symlink with a directory on the Windows 9p mount (/mnt/d). Recreate the exact locked dependencies on Linux ext4 and restore a source-only symlink, preserving the slow directory outside the repository. Do not change production dependencies, test deadlines or assertions. Repeat the complete gate; do not treat this diagnosis as proof until the retry passes. Final merged-tree check f3a7e7b0-d9d1-4258-b6f7-972722203ae8 / job b5c08ac3e: exit 0, npm test 19/19 PASS, strict validation 15/15 PASS, staged and unstaged diff whitespace checks PASS. No tests, assertions or deadlines were changed. Runtime source dependencies now resolve through npm/node_modules to a dedicated Linux cache, not the personal agent. The slow directory is preserved outside Git at ../.pi/dependency-backups/node_modules.slow-20261019T173910Z. The prior attempt to register a check was aborted before a job was assigned (f44e8391-3a20-4426-825d-729981ef5353, recorded unknown); the subsequent successful full check is authoritative for the final merged code/dependency tree.

## Final review and archive handoff
Reviewed the complete owned change (including every lock entry and all new change documents) against baseline 04f5038, and all eight upstream merge files against that baseline. The upstream dependency delta is only pine-of-glass 0.18.0 → 0.18.1; upstream archived change is retained unchanged. Only this evidence, task completion markers and the archival path change follow the successful gate; rerun strict validation and diff checks on the archived tree before commit. Publish the reviewed merge commit to origin/main using an ordinary fast-forward push, then verify remote HEAD. Publication success must be reported from the actual Git output, not inferred here.

## Limits
No Pi runtime deployment, generated skill/config rewrite (openspec update), settings/auth changes, VPS mutation, paid model requests or automatic restart. Offline gate does not prove live provider/browser/SSH availability or answer quality. Remote CI has not been run/verified for this revision. Raw test-results, dependency directories and personal backup are not committed.
