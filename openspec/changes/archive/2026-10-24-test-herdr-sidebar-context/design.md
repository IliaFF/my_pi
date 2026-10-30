## Context
Baseline 90f89ae, clean pi-build. Pinned extension 8864764e65a469f7d90f9a0deb39ec3f0b26befc; Herdr 0.9.3, Pi 1.4.0, Node 24.18.0. Prior deterministic SDK context probes passed, but real pane/profile and sidebar were untested.

## Decisions
- Reuse upstream test/integration/herdr-lab.ts: private HOME/XDG/config/socket/plugin registry; no inherited HERDR_* variables; stop only verified-owned server PIDs, retain uncertain residue.
- Run upstream sidebar integration against isolated servers, real attached client and Pi integration. No calls to the caller's server. This is synthetic characterization, not delegation of a real one-window user task.
- Actual child characterization uses the pinned extension, a synthetic local provider, full context package paths and one explicit test profile. No production config or credentials copied. Deliberate local loopback provider traffic is not a cloud/live model request.
- Report active tool inheritance, repeated deterministic compactions, async result delivery, persistent reuse and sidebar actions separately. Missing methods/ABI errors are blockers, not reasons to touch production or patch the candidate.
- No screenshot/visual quality claim without actual rendered evidence. Full npm gate and strict archive validation are mandatory before source commit.

## Risks
Herdr plugin permissions are not a sandbox; Focus is server-global. Only private lab servers may receive view changes. Cleanup uses recorded process identity and owned roots. Faux replies cannot prove autonomous reasoning or semantic constraint retention.
