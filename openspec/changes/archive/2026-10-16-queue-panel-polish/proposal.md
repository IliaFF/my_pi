# Queue panel polish and telemetry assessment

## Why
The first queue widget is functional but visually plain. Borrow presentation/interaction ideas from rpiv-todo without importing its session task store; assess rpiv-telemetry against our existing profiler before adding duplicate or sensitive collection.

## What Changes
- Tree rows, themed current/pending/blocked states, quiet overflow and a short discoverable collapse hint.
- Ctrl+Shift+T aliases /queue panel. Native tools-expanded mode (normally Ctrl+O) reveals more unfinished tasks within half the terminal height; preview remains at most six rows and also shrinks with the viewport. Render stays IO-free.
- Preserve TODO bytes, FIFO, queue mutations, no model calls and all lifecycle/trust guards; never show global Completed/Deferred history or a misleading lifetime done/total percentage.
- Record a code-based telemetry borrowing assessment, including privacy, request timing, failure isolation and overlap. Do not install MLflow, add dependencies or change profiler behavior.

## Capabilities
### Modified Capabilities
- `task-selection`: polished, bounded queue presentation and native interactions.
- `build-validation`: native SDK/terminal coverage for polish, shortcuts and live layout.

## Impact
Queue core/panel/index/README and existing queue tests; assessment and evidence in this change. No config, state schema, tool contract, package pin, deployment or publication changes.
