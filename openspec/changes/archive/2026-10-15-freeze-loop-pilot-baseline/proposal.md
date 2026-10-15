## Why
Root task63db153ae10f requests an owned-diff clarification and measured grouping pilot. Existing profiler already collects5+5 tasks, but its claimed frozen baseline is recomputed from mutable receipts; rewriting or adding earlier baseline data changes the comparison. Historical telemetry also cannot prove all checks ran: shell/background checks may be unobserved.

## What Changes
- Clarify full owned final diff vs unrelated pre-existing work in general APPEND; preserve broad safety requirements.
- Freeze the first five observed completed comparable baseline code tasks into a private exclusive-create snapshot, and use that snapshot rather than subsequently edited receipts.
- Keep errors/check counts descriptive and state insufficient comparability/coverage; no causal, price or answer-quality claims.
- Audit five completed historical tasks without treating single-operation batches as proof of independence or savings.
- Start a prospective5+5 pilot with current setup task excluded; do not fabricate five grouped completions.

## Capabilities
### New Capabilities
- `loop-grouping-pilot`: immutable bounded baseline and honest prospective observation.
### Modified Capabilities
- `general-agent-policy`: full owned diff scope.

## Impact
loop-profiler.ts, unit/actual SDK tests, APPEND and policy test, documentation and private metrics-only artifacts. No dependency/model/provider changes; installed changes require scoped backup and verification. No additional live model calls.
