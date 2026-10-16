# Validation evidence

Baseline: clean source revision `0d46f1fb242847cb85d3f13715f8a9e3535356d3`. Code, native regression tests, managed-file manifest, installer copy list and specs are bundled in the source commit containing this archive. No deployment, publication, package changes or personal runtime writes.

Environment: Node v24.18.0, npm 11.16.0, Python 3.12.3; actual Pi SDK and pi-tui 1.3.0; OpenSpec 1.14.1.

## Failures before fixes

- Formatter tests initially failed because `formatQueuePanel` did not exist. Native SDK panel startup then reproduced absent watcher/UI behavior (after completing the native theme fixture).
- Native old-callback race reproduced `An old callback must not invalidate a fresh read`: previous task text remained instead of Fresh generation. Generation rejection now precedes shared revision mutation, with end-of-read generation/revision checks retained.
- First full gate passed queue SDK but failed installed RPC startup with `Cannot find module './panel.ts'`. Added panel.ts to manifest-managed snapshots/restore and install.sh's existing queue copy list. The complete gate then passed.

## Passing checks

- `node --test scripts/test-todo-queue.mjs`: 19/19, including bounded FIFO output, hidden completed/deferred tasks, blocked count, collapse, VT/bidi/control sanitization and Unicode preservation, plus all previous queue/store regressions.
- Actual native SDK test in the mandatory no-network gate: PASS. Real SDK registration/event dispatch/reload, real filesystem metadata watchers/atomic replacement, real native theme and visible-width helpers; temporary TODO/agent and faux/no provider. Captured UI boundary, not a fake queue implementation. Checks cover narrow Unicode widths, trust/headless/RPC exclusion, collapse/read-only model-message invariants, own slash mutations, invalid/deleted/empty/startup-missing files, recovery, replacement, old callbacks and late-read shutdown cleanup. Existing FIFO/selection/errors/history assertions retained.
- Isolated execution of the actual installer queue copy line: PASS; copied helper byte-identical and manifest entry restore-enabled.
- `npm test`: exit 0; all 16 mandatory checks passed, including installed `smoke/rpc-startup`. No credentials, paid requests or production TODO mutation. After archival/spec merge, `npm test` was repeated: exit 0, all 16 checks PASS again (including queue-sdk, OpenSpec and installed RPC startup). SHA-256 comparison confirmed all 17 reviewed owned files stayed unchanged during this final gate. Only this non-executable evidence record was finalized afterwards.
- Review: all owned core/index/panel/README/test/manifest/installer and change files checked against baseline; no dependency or second task store. Exact callback unwatching avoids removing another listener. `git diff --check`, JSON parse and `bash -n install.sh`: PASS. OpenSpec archival completed with all four implementation checks closed; strict all-spec validation: 12 passed, 0 failed. Final archive/spec validation and source commit are tracked to completion by the root TODO, not declared by an unfinished archive checkbox.

## Limits

Metadata polling is approximately one second, not realtime. A TODO absent at startup is discovered by `/queue panel` or a new session, not a directory watcher. Existing ancestor/read-write file discovery is unchanged. Collapse is session-local; no hotkey or config added. Captured native rendering is not a real full-screen interactive visual/accessibility test. No host install, CI job, external live service or performance improvement is claimed. Raw local logs/review remain outside the portable repository under `reports/todo-queue-panel/`.
