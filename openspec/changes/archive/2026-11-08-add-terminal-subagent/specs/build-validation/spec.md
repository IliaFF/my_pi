## ADDED Requirements

### Requirement: Terminal delegation has offline SDK acceptance
The mandatory gate MUST exercise the actual pi-subagents package and current Pi SDK with a local faux provider, no credentials and no external model request. It MUST verify child creation/result, retained-session continuation, cancellation, allowed tools/context and disabled recursion. No-prompt RPC startup MUST verify extension registration alongside the existing background tools. Checks MUST use isolated temporary runtime and finite deadlines.

#### Scenario: Offline acceptance
- **WHEN** npm test runs
- **THEN** actual child lifecycle and configured RPC startup pass without live model calls, and test results retain true exit codes

#### Scenario: Runtime deployment
- **WHEN** offline source acceptance and review pass and approved installation completes
- **THEN** backup, preserved parent settings and installed-source bytes are checked and runtime RPC starts without a prompt; restart and unverified live behavior are reported
