## ADDED Requirements

### Requirement: Immutable observed baseline
The profiler MUST freeze five completed comparable baseline code tasks, including all their recorded runs through first completion, into a private first-writer snapshot. Later receipt edits, backfilled tasks, continuations or ring-log pruning MUST NOT change frozen comparison values. Corrupt snapshots MUST be surfaced rather than silently reset.

#### Scenario: Receipts change after phase transition
- **WHEN** grouped collection has started and an old baseline receipt is rewritten or backfilled
- **THEN** model-call/time/check metrics still use the original frozen baseline

### Requirement: Honest bounded pilot
The pilot MUST preserve current scope/coverage diagnostics, missing-data and mixed-attribution warnings, completion-based5+5 collection, bounded samples, explicit stop/reset and no model calls from profiler lifecycle. Errors and checks MUST remain visible; counts MUST NOT prove quality, test completeness or causal speedup.

#### Scenario: Insufficient historical data
- **WHEN** five historical tasks are audited but they do not form a valid paired comparison
- **THEN** record the limitation and start prospective collection without manufacturing after-samples or claimed savings
