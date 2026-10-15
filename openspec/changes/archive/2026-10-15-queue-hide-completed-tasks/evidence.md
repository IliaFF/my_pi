# Evidence: unfinished-only slash queue listing

## Baseline and scope

Initial source tree clean at `1e277ed48ca8fb3f8cda8a743a65f2c1cd522893`, main matched origin/main. Root authoritative task `4d237587c690`. User explicitly selected all unfinished tasks (In progress, Pending, Blocked), not pin/unpin. No runtime installation, production mutation, publish or push.

Owned executable changes: three formatter/caller lines in local-extensions/todo-queue/index.ts and expanded existing actual-SDK test. README explains slash/tool distinction. No new dependencies, storage changes or API migrations.

## Failing regression before fix

`node scripts/test-todo-queue-sdk.mjs ./npm/node_modules` exited 1 before source edits with `AssertionError: Slash list must hide completed history`. Actual notification contained `Completed (queue-managed)` and `#done Done`.

## Passing checks after fix

- Same actual-SDK command: exit 0. `/queue` and `/queue list` tested on mixed and history-only temporary TODO. Current/pending/blocked retained, completed heading/task absent, pending order unchanged, notifications info-level, session message count unchanged, TODO bytes unchanged.
- `task_queue action=list`: completed task remains in text and details; no mutation. Existing explicit-id/FIFO/rejected-id/current-task/native-error coverage retained.
- `openspec validate queue-hide-completed-tasks --strict`: exit 0 before full test.
- `npm test`: background job b41ae6c5b completed exit 0. `test-results/results.json`: passed=true, setupErrors=[], 16 checks passed, every exitCode=0: openspec, ci-config, harness, release, loop-pilot, patch-apply, patch-verify, stack-surface, deferred-tools-sdk, train-agents, queue-sdk, ponytail-sdk, background-jobs, loop-sdk, context-runtime, rpc-startup.
- Full owned diff and all new change files reviewed; `git diff --check` passed before archive. Source and test scope not modified while npm test ran. Generated test-results are ignored, not committed.

The generated result revision names the pre-change HEAD, not a claim that it tested only that committed tree. The test ran on the following changed-scope file contents:

| File | SHA-256 |
|---|---|
| local-extensions/todo-queue/index.ts | b73fb701a7f02857d1192c9218222ce3f4ead759b5aa80827de9e5fc82bb0e5b |
| local-extensions/todo-queue/README.md | d8be3c2b49ddb4b9e6e98e639e444fb9b0e50986704e89cb2fb11481c328f66b |
| scripts/test-todo-queue-sdk.mjs | e88210efeb6aa70f347d2180a2692e926cdb1a30b686eb3c6b53a16e7ef59750 |

## Archive validation

`openspec archive queue-hide-completed-tasks --yes` completed, applied one added requirement to task-selection and archived the change as `2026-10-15-queue-hide-completed-tasks`. Final `openspec validate --all --strict`: 11 passed, 0 failed. `git diff --check` passed after archive. Only documentation/spec metadata changed after the full npm test; executable file hashes remain as recorded above.

## Review and limits

Both formatList callers checked: slash caller opts out of history; tool caller retains its prior default and full structured snapshot. Parser, task selection, mutation/locking and dispatch paths untouched. The faux provider and temporary agent directory do not establish live service health or interactive terminal rendering quality. Installed global extension remains unchanged until a separately approved deployment. Archive and local commit are closing steps; no external push is authorized by this change.
