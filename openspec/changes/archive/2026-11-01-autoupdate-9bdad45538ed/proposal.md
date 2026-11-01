## Why

Align the managed npm build to the authorized exact release targets. The only direct dependency behind the target is @amaster.ai/pi-browser-use (0.1.33 -> 0.1.34); core/TUI remain 1.4.0. No new features or deployment are requested.

## What Changes

- Update the existing browser-use exact pin and corresponding npm lock resolution.
- Preserve package membership, scripts, allowScripts, versioned patches and all local behavioral contracts.
- Leave the controller-prepared configs/settings.json byte-identical.
- Run the unchanged full npm test gate and document evidence before archiving.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `build-validation`: record candidate-specific exact-pin acceptance without changing the existing gate or behavior.

## Impact

Only npm dependency release metadata and new OpenSpec records are expected to change. No personal runtime, credentials, provider calls, deployment, push or Git commit is part of this work. npm/GitHub reads are authorized; paid API keys are not.
