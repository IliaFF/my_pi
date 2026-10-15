# Evidence — process-only background shell pilot

## Approval, pin and preservation
User approved a process-only pilot, after excluding delegates/Fusion/automatic model wake/provider changes. Parent source `de168c8`; Node v24.18.0, Pi core/pi-tui 1.2.0, package pi-background-tasks 2.6.10. Peer range mismatch was not a rejection filter: actual native import and current SDK lifecycle worked.

Isolated npm prefix prepared before active changes. Only node_modules/pi-background-tasks added; all existing lock package records identical, not merely versions. turndown was already available. Source now 19 direct dependencies/423 lock package entries excluding root, 16 Pi package settings entries. Source pin uses only dist/extensions/background-tasks.js; attribution entry never selected.

Full pre-activation backup: ignored backups/20261015-043852-248688. Every managed payload hash and npm-tree SHA256 verified before runtime npm installation. Runtime install used cached package, ignore-scripts/legacy-peer-deps/offline and exact version. Old direct dependency mapping and every retained transitive record identical. Private settings structurally equal old settings plus one filtered package; auth/models/mcp/context-policy/APPEND/Meantime bytes unchanged. No private snapshots/logs/data staged.

## RED and actual safety findings
Unmodified package regression exited 1: default config enabled delegate/fusion/attested/attribution, not process-only. Source inspection confirmed process feature alone leaves isAgent and completion wake available through bg_run/EventBus. Shared registry admission now rejects these before command/path/process side effects; schema, tool defaults/guidance and EventBus capability flags aligned. Feature parser rejects unapproved override tokens, dock hotkey defaults off, unrelated clear shortcut/update instructions removed, background update check disabled. No provider route patch or new manager.

After restricting lanes, real SDK output-cap test failed: upstream appended an error notice after cap was already reached. Both ordinary registry and reload-owner sinks now retain cap failure in metadata rather than writing over the hard limit. Subsequent tests verify both lanes fail/stop and file size <=1MiB. Default deadline 600s; explicit invalid/nonfinite/<1s timeouts rejected by tool and EventBus tests.

Initial test cleanup removed workspace before asynchronous survivor metadata I/O settled, causing ENOENT after a PASS line. Fixture now cleans at Node beforeExit after referenced I/O drains; this was fixture cleanup, not claimed as a production package repair. Repeated standalone acceptance outputs each contained only one PASS line, no trailing warnings/errors. Test cleanup cancels recorded child groups/PIDs on failures as well.

## Real offline acceptance
scripts/test-background-jobs.mjs uses actual package entry, ModelRuntime, DefaultResourceLoader, createAgentSession, SessionManager and native tool execute/context wrapping, no fake hooks. Empty credential store/faux route, fetch blocked, no prompt sent.

Passed:
- Exact four process tools, unsupported lane overrides rejected; tool/EventBus isAgent true and wake true rejected before launch; invalid 0/-1/NaN/Infinity timeouts rejected.
- EventBus capabilities explicitly report no agent/wake support; defaults record triggerOnCompletion false and timeoutSeconds 600.
- Launch returns live job; ordinary success exits 0 with retrievable text, failure preserves exit 7.
- One-second timeout becomes failed and shell execution stops.
- Explicit cancel records killed and Linux shell/Node child process tree stops (/proc checks distinguish zombies from executing processes).
- Ordinary and opt-in reload-owner jobs both stop on output cap; bounded read <=256 bytes and persisted output <=1MiB.
- Actual session.reload preserves opted job ID/PID/status, cancels non-opted job; later cancel works.
- Actual SDK shutdown dispatcher with reason quit stops even opted child; fresh SDK runtime in same process does not adopt it or claim running historical records. This is not an OS crash/restart survival test.
- 0 agent_start events/model turns, 0 fetch attempts, no extension errors.

## Gates and review
- Source npm test: exit0, all 13 checks PASS, with new background-jobs integration bounded to 60s; all existing real SDK/context/CLI gates retained.
- Host npm test -- --agent ~/.pi/agent: exit0, all checks PASS. Drift audit failures=0/warnings=3 for preserved private settings/mcp/APPEND; no reset/snapshot to hide differences.
- python3 scripts/test-release.py: exit0, exact pin/lock, native configuration, hygiene and pristine archive patch replay PASS. Patch is version-gated across five shipped dist files; stock package TS is not runtime entry or locally rebuilt.
- Native guarded RPC proves /bg,/jobs,/logs,/kill,/tasks owned by pinned background package; Fusion/update commands absent. No prompt/model call. Actual command metadata manually inspected as well.
- Full changed config/dependency/README/harness diff, complete new patch and acceptance script reviewed. Timeout negative branch and killed status assertions strengthened during review. git diff --check PASS.
- Ten implementation/config/test/doc paths mirrored to installed maintenance byte-for-byte; runtime module symlink preserved. Installed maintenance npm test -- --agent ~/.pi/agent: exit0.

## Limits and closure
Current running UI needs reload/restart to load added extension. Live TUI dock/notifications, simultaneous jobs under heavy load, Windows, SSH routing, OS crash behavior and production rollback not exercised. Local commands are unsandboxed and may themselves invoke network/paid tools; no automatically launched model work or paid calls in this pilot.

Per-job 1MiB cap is not a total cross-session disk quota. Bounded artifacts remain in project .pi/tasks, need explicit later cleanup; /bg-clear affects terminal UI/in-memory records, not guaranteed disk reclamation. No automatic deletion or new task-planning authority. README and tool guidance forbid editing checked scope while jobs run; proof still requires tying result to the unchanged revision/diff and authoritative TODO.

OpenSpec archive completed. Its generated new capability Purpose was a placeholder, so initial post-archive strict contract failed; Purpose replaced with actual scope, final full source gate exited 0 (all 13 checks). Final installed maintenance gate exited 0, including actual background lifecycle. All 19 staged source/spec/archive paths matched mirror byte-for-byte. No push/current-revision CI; local commit follows completed offline checks.
