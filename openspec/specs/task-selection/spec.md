# task-selection Specification

## Purpose
Honor explicit pending task identity and native tool errors without queue churn, preserving FIFO, atomic mutation and single-current protection.

## Requirements

### Requirement: Claim respects explicit task identity
The queue MUST select exactly the requested pending id without reordering remaining tasks. Omitted id MUST retain FIFO and existing generated-id behavior. A current task MUST still prevent another claim.

#### Scenario: Select second pending task
- **WHEN** claim supplies the second pending task id
- **THEN** only that task moves to In progress and the remaining order is unchanged

#### Scenario: Unknown or non-pending id
- **WHEN** claim supplies an absent, blocked, completed or blank id
- **THEN** the operation fails and TODO bytes remain unchanged

#### Scenario: No id
- **WHEN** claim omits id
- **THEN** the first pending task is selected as before

### Requirement: Tool failures remain failures
Queue tool failures MUST propagate through the native SDK error channel and MUST NOT be successful-looking text responses.

#### Scenario: Bad id on real SDK
- **WHEN** the actual queue tool executes a claim for an unknown id
- **THEN** the SDK records a failed tool execution and the file remains unchanged
