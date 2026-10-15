## ADDED Requirements

### Requirement: Full owned diff excludes unrelated work
General policy MUST require reviewing all final owned changes against the initial working state, including owned untracked files, while preserving unrelated pre-existing tracked/untracked work. It MUST NOT imply reviewing or staging every repository change indiscriminately.

#### Scenario: Dirty initial checkout
- **WHEN** unrelated changes exist before the task
- **THEN** retain them unchanged, verify the complete owned final scope and do not discard or silently stage unrelated work
