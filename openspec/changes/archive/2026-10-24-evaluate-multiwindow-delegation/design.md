## Context
The source baseline is clean at 5e43d87. Root fresh_pi is not a Git repository; its TODO remains authoritative. Current core is Pi 1.4.0, Node 24.18.0 and Herdr 0.9.3. Existing bg_run is process-only and MUST NOT be used to delegate model work.

## Decisions
- Treat >1 managed context window as a forecast, not a token counter or a requirement to overflow first. The parent assesses independent goal, boundaries and verifiable output. Small scouts/prototypes stay local; unclear user intent is clarified.
- Preserve native start_task_session semantics: sequential goal handoff is not delegation. No agent launch authorization is granted by this policy alone.
- Inspect and test pinned upstream candidates in private temporary directories with no copied credentials or personal histories. Upstream faux tests are not delegated agent sessions.
- Distinguish actual extension integration, upstream unit tests, source inspection and untested live scenarios. Artificial compaction/history tests cannot prove successful autonomous multi-window work.
- Do not implement a custom orchestrator or install candidates into production. Record any incompatibility rather than patching upstream to hide it.

## Validation
Policy characterization, relevant offline upstream suites and available actual-SDK compatibility probes; full npm test, strict OpenSpec validation and owned diff review. Evidence must list versions, exit codes, context limits and explicit untested cases. Commit/archive only after gates pass.
