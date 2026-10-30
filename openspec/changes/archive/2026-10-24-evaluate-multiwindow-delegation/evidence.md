# Evidence: multi-window delegation

## Baseline and scope
- Clean source baseline: `5e43d87`; root fresh_pi is not Git, authoritative task `79c119779b82`.
- Owned source changes: portable policy, README/report, two opt-in SDK/faux probes, restricted fake-socket network guard, policy/harness regression, this OpenSpec change. Root AGENTS contains the same rule but is outside the source Git repository.
- No production changes, external model calls, credentials/history copies, candidate runtime dependencies, push or publication.

## Pinned candidates and executed checks
- Herdr `3.3.1`, SHA `8864764e65a469f7d90f9a0deb39ec3f0b26befc`; Durable extension `0.1.0`, SHA `50b1d290eb7aed1079e2272270e95b2d2e507aab`.
- Disposable npm ci with lifecycle scripts disabled: exit 0 for both; post-install source trees clean.
- Durable upstream npm test: exit 0, 55 passed, no skipped; covers faux SIGKILL/ownership/reopen, unsafe tool interruption and persistent reports.
- Herdr first test under blanket network guard: exit 1, 987 passed/23 failed/1 skipped; failures were fake Unix socket connections blocked by the harness. No candidate source patched or tests narrowed.
- Herdr full rerun with only fixture Unix sockets admitted: exit 0, 1010 passed/0 failed/1 skipped. Skip: late-sidecar-after-pane-absence unsupported fixture.
- SDK 1.4.0 Herdr child protocol + context stack: exit 0, two deterministic compactions, zero model calls, context tools available.
- SDK 1.4.0 Durable parent extension + context stack: exit 0, same assertions; explicitly NOT inheritance by Durable children.
- Durable child runtime: exit 0, two faux model summaries, SQLite reopen, same child conversation, continued answer; child tool selection remains read only, no parent context tools.
- Policy test first fails before rule and passes afterward; final policy/harness unit scope has two tests.
- Python new test formatted with autopep8; Ruff passed. Opt-in Node scripts pass node --check.
- Strict validation of evaluate-multiwindow-delegation: passed before full gate.

## Interpretation and limitations
See `docs/multiwindow-agent-evaluation.md` for exact source pointers, reproduction and lifecycle matrix. Herdr is the closer candidate for our context system, conditional on real child profile/tool inheritance. Durable recovery works in tested faux scenarios but its model-summary compaction is not our deterministic folding/recall system. No real pane spawn, autonomous >1-window task, semantic retention guarantee, live provider recovery or performance/cost claim. Node network guard is not a shell/OS sandbox. Worktrees are not permission isolation; external side effects do not become exactly-once.

## Build gate and review
- Full `npm test`: exit 0, all 22 stages passed, check `e53aa469-86b5-4128-ac26-e5da1fc7c798` / job `b2c70051e` (pre-archive scope).
- Full owned tracked/untracked review completed against the clean baseline. Review strengthened the opt-in probes: assert active context tools after each compaction and the distinct latest summary in reopened Durable model input, not merely a token also present in persistent instructions. All three relevant probes rerun with `env -i`, exit 0.
- OpenSpec archive initially generated a placeholder Purpose in the new main spec; strict post-archive validation detected it. Replaced it with the capability purpose and reran strict validation.
- Archived scope gate passed all 22 stages and all three SDK/faux probes (check `8c881a1b-4ba2-4c69-9609-c268dfb8b91d`). The queue rejected superseding the earlier check because its closing snapshot was recorded only after source edits. A same-command full rerun is required before commit. Earlier checks are replaced by same-command rerun or explicit supersession, never reused after edits; latest authoritative check and commit are recorded in root TODO.
- Full transient logs: `/tmp/pi-multiwindow-evaluation-20261024/logs/`; no npm trees, sessions or databases committed.

## Stable offline log digests (SHA-256)
- Durable upstream: `3111f61753fa1c2ef38c7ed5b8a62824ce6735a43ab420c8f259da56f95efdbf`.
- Herdr original blocked run: `e5d5dfc78e9c7646b9de2c5b211c059febb43a90cbef9a64b9dc17bc6a5c4863`.
- Herdr successful fake-socket rerun: `24b1eb1b9cfd31385bd6fa513f0ea295362f3e10716f69739d3e573290a9f1b8`.
