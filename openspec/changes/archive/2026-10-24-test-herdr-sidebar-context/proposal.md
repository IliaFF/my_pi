## Why
The user requests actual Herdr child and optional sidebar testing before deciding on installation. Prior offline SDK probes did not launch a real child or verify full profile inheritance and rendered sidebar filtering.

## What Changes
- Add an opt-in isolated Herdr/Pi characterization using pinned pi-herdr-agents 3.3.1, current Pi and current context extensions, with no external model calls.
- Exercise the upstream isolated sidebar suite on the installed Herdr build and report actual render/plugin/lifecycle evidence.
- Record results and blockers without activating production packages or modifying current Herdr panels.

## Capabilities
### New Capabilities
- `herdr-sidebar-evaluation`: isolated actual-spawn and sidebar evidence.
### Modified Capabilities
None; the multi-window delegation threshold and shell-only background policy stay unchanged.

## Impact
Optional test tooling and evidence only. No production deployment, credentials, real-model claims, custom orchestrator or paid requests.
