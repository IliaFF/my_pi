# Evidence

## Baseline and scope

- Apply baseline: `3071b2d`; Node `v24.18.0`, source Pi `1.4.0`, context-fold `0.7.0`.
- Initial dirty scope: pre-existing TODO.md, .pi/tasks/, enable-canary-500k-cache-warming/ and this change's planning artifacts. No runtime installation or paid/live calls authorized.
- Private history remains outside Git. The planning design contains only minimal evidence pointers.

## RED before source fixes

- `env -i PATH="$PWD/npm/node_modules/.bin:$PATH" HOME=/tmp PI_CODING_AGENT_DIR="$PWD" node scripts/test-auto-ultra-compact.mjs`: exit 1; compact customInstructions lacks `Firstmate queue/state` and unconditionally requires TODO. An earlier inherited-environment run hit an existing threshold override; it is not counted as this regression.
- `node scripts/test-firstmate-policy-sdk.mjs "$PWD/npm/node_modules"`: exit 1; actual SDK global AGENTS + trusted project APPEND lacks Firstmate restoration exception. No model requests are made.

## Limitations

Offline prompt assertions do not prove live model behavior or Firstmate availability. CI, runtime installation and live fleet checks are not run.

## Targeted GREEN

- Clean-environment `test-auto-ultra-compact.mjs`: exit 0, both real SDK compaction load orders, no model/auth calls; manual/error/session-change lifecycle remains PASS. Test role-mention fixture uses the same conditional policy, not a role classifier.
- `test-firstmate-policy-sdk.mjs npm/node_modules`: exit 0; real SDK trusted/untrusted project APPEND assembly retains global restoration exception, zero network attempts.

- Index RED: `test-context-fold-index.mjs npm/node_modules` exit 1, new restore envelope leaked into User intents. After updating versioned patch (and only source-local npm dependency), same clean-environment no-network command exit 0: soft/hard old/new envelopes excluded, ordinary lookalike retained; actual SDK both load orders PASS.

- Store RED: `node --test scripts/test-todo-queue.mjs` exit 1: 21 PASS / 4 FAIL. Failing cases cover foreign parent discovery (Git/non-Git), nested/linked worktree boundaries, external TODO links/canonical aliases and unusable TODO/access errors; no resolver fix yet.

- Store GREEN: `node --test scripts/test-todo-queue.mjs` exit 0, 25/25; real Git nested/linked worktrees, canonical aliases/foreign links, unusable file and unprivileged EACCES child, unchanged foreign TODO. No new queue setting or dependency. Error prefix retained for task-session; all three callers share the resolver.

- `env -i PATH=... HOME=/tmp PI_OFFLINE=1 node --require ./scripts/no-network.cjs scripts/test-todo-queue-sdk.mjs "$PWD/npm/node_modules"`: exit 0; actual tool/slash reject foreign parent TODO, native panel never watches/displays it, foreign bytes unchanged.
- Same clean-environment command for `scripts/test-task-session-sdk.mjs`: exit 0; actual native handoff ignores foreign current task, own current protection/cancellation/pending/background guards remain PASS. Faux provider only, no live model calls.

- Portable installer RED: `node scripts/test-portable-stack.mjs` exit 1, known legacy Firstmate section refused as conflicting. After source installer fix: exit 0; exact legacy migration, private CRLF bytes, repeat idempotency, unknown/extended/indented conflicts, no partial migration on later conflict and symlink refusal PASS. Only temporary fixture used.
- Embedded changed Python extracted to /tmp: autopep8 applied, `ruff check` PASS; formatted snippet copied back, `bash -n install.sh` PASS and portable test repeated PASS.

## Full gate integration

- First `npm test`: exit 1. Existing release/harness/deferred-tools SDK assertions still required unconditional TODO wording. Queue, task-session, both compaction paths, Firstmate SDK and portable installer suites passed. Updated the three owning contract tests to require both ordinary TODO and conditional Firstmate state.
- Ruff on changed Python contract files reports 13 existing findings (9 release, 4 harness); compared diagnostic code/message multisets against `git show HEAD:<file>`: identical, no new findings. Unrelated lint cleanup intentionally omitted. Changed lines formatted with autopep8.
- Standalone unittest diagnosis outside the build harness failed on inherited 170k overrides, then on missing fixture modules with HOME=/tmp; these are not counted as product regressions or passing checks. The full mandatory harness supplies isolated settings and dependency links.

## Full GREEN and owned review

- Recorded check `45bf3ec4-6061-471c-ba8d-038cd6ee3707`, job `b8ed15827`: `npm test && node_modules/.bin/openspec validate fix-queue-context-isolation --strict && git diff --check && bash -n install.sh`, exit 0. All 27/27 mandatory build checks PASS, including 95 Python harness tests and actual SDK integrations.
- Versions: Node v24.18.0, Python 3.12.3, source Pi 1.4.0, context-fold 0.7.0. Local report remains ignored at test-results/results.json; no logs or dependency trees enter Git.
- Full owned diff reviewed against 3071b2d, including all eight new change artifacts and additional release/harness/deferred-tools assertions discovered by the full gate. Initial dirty TODO.md and unrelated Canary artifacts are not staged; .pi/tasks contains only private runner evidence and remains outside the commit. No runtime settings/credentials were changed.
- CI was not run; no live model, SSH, Chrome, Firstmate fleet or production-install availability claims. Non-Git parent TODO inheritance intentionally removed; personal APPEND with preserve-settings remains unchanged and may require a separately approved correction on deployment.
