## MODIFIED Requirements

### Requirement: Process-only background pilot has real offline lifecycle checks
The mandatory gate MUST use actual current Pi SDK/package shell lifecycle in a temporary workspace, without credentials/external provider calls, with bounded deadlines and child-tree cleanup. Existing SDK/CLI gates MUST remain. Default and explicit wake MUST use actual SDK/scripted faux provider (not only callback/static mocks), covering idle/busy, defaults, duplicates, tool/EventBus admission, success/failure/cancel and native reload/shutdown.

#### Scenario: Full offline regression
- **WHEN** process-only package pin/patch changes
- **THEN** success/error/timeout/cancel/log-limit/reload/shutdown and default completion continuation (including timeout and /bg), explicit opt-out and explicit wake checks plus unsafe-request rejection run before runtime acceptance
