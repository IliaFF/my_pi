## ADDED Requirements

### Requirement: Native deferred tools have actual-package SDK regression
The mandatory gate MUST load the actual patched remote, preview and context packages with current Pi SDK in an isolated temporary agent, exercise safe discovery/execution and recorded-session restoration, and inspect native Codex payloads before any transport. No production sessions, credentials, SSH connections, renderer or live model are used.

#### Scenario: Full offline gate
- **WHEN** exposure patches or startup defaults change
- **THEN** eager-registration regressions, loss of callable tools, broken native discovery, altered resumed declarations or changed additive prefix fail the gate and leave a bounded log
