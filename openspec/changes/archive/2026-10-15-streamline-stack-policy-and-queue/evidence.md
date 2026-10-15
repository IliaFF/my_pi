# Source evidence and deployment plan

## Reproduction

Root TODO c0ddf2ec4baf is the only current task. User approved whole-installed-stack offline audit and checked activation with backups. Existing claim ignored its id; task selection was recorded once directly in authoritative TODO rather than repeating the known release/move/claim workaround. Other pending tasks/order were preserved.

Actual Pi1.2.0 SDK with faux provider and temporary TODO reproduced stock claim(id=second) returning first: exit1, `Explicit id must select second, not first`, `'first' !== 'second'`. Initial SDK setup used tools=[] and produced Tool not found, then corrected the explicit SDK allowlist to task_queue before recording the valid regression. No production task was used as a fixture.

## Checks

- Baseline background job b5203d37a: `npm test -- --agent ~/.pi/agent`, exit0, all14 checks PASS before changes.
- Background inventory b189ad460: exit0, 17 personal package declarations,1 project override,4 local extension entries,2 MCP; three unconfigured direct dependencies are core/tui/typebox, not orphan extension features. Metadata excludes credentials/transport URLs.
- Core/store queue:16 tests PASS; actual SDK queue:7 tool executions cover exact second id, FIFO, missing/blocked/completed/blank ids, current-task guard, native isError and unchanged file on rejection. Existing generated-id callers remain compatible.
- Policy harness:9 tests PASS, including clear communication, no Caveman, language/safety/conditional TODO/recovery and portable non-project wording. Last wording clarification limits no-praise to the user/their work rather than forbidding requested creative praise of others;9 harness tests rerun PASS.
- First new full gate failed on two obsolete APPEND literal assertions in auto-ultra test. Updated only those policy strings to their equivalent current wording; no native compaction test removed.
- Background be7083894: all15 source checks PASS plus actual installed RPC startup PASS with58 commands, no prompt/model run.
- Full diff review removed no-op catch/rethrow so SDK receives direct exceptions; focused actual SDK PASS. Background bfb17bf36 then ran all15 checks PASS on final executable queue code. All source/runtime under test stayed unchanged while jobs ran; terminal notifications/log reads were used, no polling/wake or agent jobs.
- Complete owned code, policy, tests, proposal/design/specs reviewed. Git whitespace check PASS. No extra wrapper, dependency, queue reorder or exposure/config switch added.

Post-archive background job b4b7f92ca: `npm test && git diff --cached --check`, exit0, all15 checks PASS on final policy/code/canonical specs. Operational host tests follow deployment and are recorded under the root task/report, not presumed here.

## Audit conclusions and limits

Queue selection/error channels were real defects and are fixed. Native codemode already defers Chrome/Jev; functions are not interchangeable with JS orchestration. FFF grep uses a soft page cap and completes a file up to200 matches; context lines can expand output. Do not impose a hard cap without pagination tests. Existing context DB, folded history and compaction recovery have distinct contracts. Retry owner routing prevents concluding two retry loops merely from two names. Keep the5-task comparable profiler pilot pending; no causal model-round/latency/cache/quality result is established.

Portable general APPEND is3098 ASCII bytes versus3373 personal bytes before deployment:275 fewer (8.15%). This is not a token measurement. Skills/Ponytail dedup patch remains enabled; critical feedback, task-conditional tracking, safety and communication are preserved. Full audit and per-component test/limit matrix live at fresh_pi/reports/pi-stack-audit-20261015/report.md with local metadata inventory.

No external model/search/browser/SSH/MCP calls were run. Startup and selected regression coverage do not test every external function or every interactive state. Tests do not prove actual model language adherence or that this policy is an optimum. Paid calls0; no push.

## Approved deployment after source commit

Preflight three installed queue files and installed maintenance old blobs against source parent; preserve unrelated settings/locks and existing Ponytail copies. Back up every changed destination, including personal APPEND, with hashes and a targeted drift-refusing restore helper. Copy committed source into maintenance and runtime and verify byte parity. Run full host gate and actual installed queue SDK via background shell, then recheck protected hashes and rollback preflight. Record restart requirement; do not terminate the current user session automatically. On failure restore targeted files or stop on unexpected drift.
