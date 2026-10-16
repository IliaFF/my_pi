# Validation evidence

Baseline: clean source 247592c. Upstream research: MIT rpiv-mono revision 1ffa165, rpiv-todo/rpiv-telemetry 2.13.8. Runtime: Node v24.18.0, actual Pi SDK/pi-tui 1.3.0, OpenSpec 1.14.1.

## Regressions and passing checks

- Before implementation, modified/new pure tests failed on tree prefixes/ignored height budget, and actual SDK test failed on missing current tree row. Failing logs retained outside Git under reports/queue-panel-polish/.
- `node --test scripts/test-todo-queue.mjs`: 20/20 PASS; current/Pending FIFO/Blocked ordering, exact overflow, budgets 1/2/3/6/12, closed last branch, immutable snapshot, no Completed/Deferred, controls and Unicode, plus existing queue/store checks.
- Native SDK integration PASS: registered Ctrl+Shift+T handler called with actual runner context; real theme methods accent/warning/dim/bold observed; same component repaint reflects global expansion/resize at budgets 6/15/3/1 without widget replacement; collapse takes priority. Existing trust/headless/RPC, real filesystem watch/atomic replace, parse recovery, missing files, reload, stale-callback and shutdown cleanup, native errors/explicit selection/FIFO/history all retained. No production TODO mutation/model calls.
- First post-change SDK text assertion encountered legitimate theme ANSI between tree/glyph/text. Corrected the text-only oracle to strip VT, not the renderer. Native theme and visible width assertions still exercise actual output.
- Isolated actual CLI/PTTY with source queue: startup, CSI-u Ctrl+Shift+T collapse/expand, native Ctrl+O revealing an additional pending row, slash collapse/expand and graceful exit 0: PASS. Temporary HOME/agent/TODO, no credentials, network guard, no model prompt. This is automated terminal evidence, not human visual/accessibility validation or user-process hot reload.
- `npm test`: exit 0, all 16 mandatory checks PASS, including real SDK, patches, contract validation and staged installed RPC startup. Full owned code/tests/docs/change diff reviewed; git diff --check PASS.
- After archive/spec merge, strict validation rejected an overlong requirement paragraph. Moved detailed status/order examples into its scenario without changing behavior, synchronizing archive delta and main spec; strict all-spec validation then passed 12/12. Final archived-scope `npm test` passed all 16 mandatory checks (exit 0); report: reports/queue-panel-polish/archived-full-gate.log outside portable Git. Remote CI was not run.
- Source-based package scan/local/project/personal keybindings found no explicit Ctrl+Shift+T binding. Native conflict resolution remains authoritative; unsupported terminal modifiers can use /queue panel. No live deployment/key-map validation claimed.

## Telemetry assessment

See telemetry-assessment.md for borrow/skip decisions, privacy caveats, exact request-phase distinctions, overlap with existing loop-profiler and source paths. Pure upstream payload summarizer and actual Dispatcher (only config dependency stubbed) characterization: PASS, no-network guarded. Demonstrated UTF-16 vs UTF-8 discrepancy, missing Responses fields, drop-oldest/FIFO behavior, shutdown waiting for a held sink and post-shutdown dropping. No MLflow server/transport, upstream full test suite, live service or speed improvement is claimed. Profiler, dependencies and production telemetry behavior unchanged.

## Ownership and rollout

No pre-existing edits reverted/staged. No store mutation, package/config pin, manifest/install wiring or task store added. Existing generation/revision guards remain. All 21 files from the previous approved deployment still match their deployed hashes. This improvement is source-only: no installation, private settings/auth/session write or push. The containing Git commit bundles implementation, tests, specs and assessment; root TODO tracks archive/final validation/commit. Local diagnostics live under reports/queue-panel-polish/, outside the portable repository.
