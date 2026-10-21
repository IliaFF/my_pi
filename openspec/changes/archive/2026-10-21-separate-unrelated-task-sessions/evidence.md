# Evidence

## Scope / baseline

Task 14d4d647ea37. Git baseline bb80b2ac70cacef00a4bd5153e433089362ab41e, initially clean. User chose common goal (not common project), ask on ambiguity, both ordinary chat and TODO queue. No deployment/push/live paid calls authorized for this change. Personal Ollama models/auth/settings are outside the changed scope and were not edited.

## Implementation and review

Native command-backed start_task_session; no secondary model/classifier, process spawn, new dependency or configuration knob. The current model must assess goal continuity using portable policy/tool guidelines. Tool enforces mechanical boundaries, not semantic correctness. It terminates old execution, waits for idle, uses native newSession/setup/withSession, retains a parent file link and transfers only the explicit task, current-request images and bounded queue budget. Queue candidate selection is read-only until actual claim. Five-task budget survives handoff and is consumed once; reload cannot silently restart it. Pending messages, untrusted projects, active TODO/background work, repeated handoff, slash-command input, blank request, first-task loops and ephemeral history are rejected. Runtime creation failure may leave an invalidated active session: persisted old history/TODO remain recoverable and native error is surfaced without stale ctx reuse. Installer/manifest include backup/copy/verification, no production installation yet.

Reviewed full owned code/config/docs/spec changes against the clean baseline, including new tool, SDK test and all change files. No pre-existing unrelated tracked changes. Generated development dependencies remain ignored Linux symlinks prepared by the previous task; no npm dependency changes.

## Tests and regressions

- be0a2c1a2 exit0: initial actual native persisted-session replacement with faux provider, candidate pre-claim, cancellation, clean automatic new-task execution, first-task loop guard and TODO ownership.
- b4bbe5707 failed on attachment assertion. Diagnosis proved the fixture PNG was rejected by native processImage before handoff, not a demonstrated handoff defect. Replaced with a valid generated one-pixel PNG and added native image acceptance assertion; attachment preservation is still required.
- b871b5ea9 exit0: targeted native handoff/queue/queue-check suites and full npm test, 20/20 stages. Scripted paths verify mechanics/policy wiring, not live model judgment quality. Initial headless UI fixture warnings about missing widget/status methods were corrected by providing those no-op UI endpoints, not changing production behavior.
- Review added failing regression `/tmp/pi-task-session-stale-run-before.log`: failed /queue resume with no current task left transferable autoRun=true (expected false), exit1. Fixed state recording at start/pause/failure and consumed markers; `/tmp/pi-task-session-stale-run-after.log` exit0.
- Further actual SDK checks pass: pending message preserved, parallel duplicate refused with a native lifecycle gate, unfinished real shell job refuses handoff, five completed tasks across two persisted sessions retain a sixth Pending, image survives, reload remains paused, injected native runtime creation failure is surfaced exactly once, ephemeral sessions refuse rather than discarding unsaved history. Headless test credentials/HOME/session files are temporary and removed; network is blocked.

## Final acceptance

Final job b49afbd37 exit0 after the review fixes: npm test PASS 20/20 stages, strict OpenSpec 16/16 (15 capabilities + active change), bash -n install.sh and git diff --check PASS. Source fingerprint before/after tests matched: dbab602dcbec506273bf5a62163e245e6edb284cc8621b6a3c027d043f531ddc. Main specs were synced from all four reviewed deltas before this gate; archive uses --skip-specs to avoid reapplying the already tested additions. Archived as 2026-10-21-separate-unrelated-task-sessions; all four spec payloads matched main specs before archive, and post-archive strict OpenSpec passed 15/15 with git diff --check PASS. Only acceptance metadata/archive paths change after the gate; production code/config/tests remain the tested bytes. CI config was tested locally; no actual CI job, live TUI, paid provider inference, classifier-quality benchmark, deployment or push claimed.
