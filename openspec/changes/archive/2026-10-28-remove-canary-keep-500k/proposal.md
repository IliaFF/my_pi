# Remove Canary, retain 500k compaction

## Why
The published build re-enabled Canary instead of the requested Canary-free 500k automatic compaction configuration.

## What Changes
- Remove Canary dependency, lock entry, patch, managed config and activation.
- Preserve 500000-token local cap, native smaller-window reserve protection and deterministic context-fold ownership.
- Replace Canary SDK coverage with direct compaction SDK coverage and reject Canary in release validation.

## Capabilities
### Modified Capabilities
- compaction-reliability: Canary-free model-safe automatic compaction.

## Impact
Source release, tests and README only; no installed runtime changes or paid/live provider checks. Existing historical archives remain unchanged.
