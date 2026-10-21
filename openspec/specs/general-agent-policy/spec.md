# general-agent-policy Specification

## Purpose
Provide portable communication, scope, evidence and task-conditional recovery rules without project-specific instructions or unnecessary orchestration.

## Requirements

### Requirement: General policy is portable and task conditional
APPEND MUST retain language, clear explanations, critical feedback, safety and truthful evidence while keeping project/package-specific workflows out. It MUST require authoritative TODO only for multi-step project work, not discussions or small edits, and reread it after compaction before resuming.

#### Scenario: Non-project question
- **WHEN** a user asks an explanation or a small single-step edit
- **THEN** no separate tracked task or fixed report template is required

#### Scenario: Multi-step work after compaction
- **WHEN** project work resumes
- **THEN** current TODO is read first and unclear task identity stops execution for clarification

### Requirement: Orchestration is bounded and evidence driven
Policy MUST prefer the simplest adequate tool path, batch only justified independent work with bounded output, avoid queue churn, and distinguish offline structural checks from behavior or quality evidence.

#### Scenario: Tool contract disagrees with requested task
- **WHEN** a tool selects the wrong task or cannot honor an id
- **THEN** execution stops to inspect/fix the contract rather than manipulating unrelated tasks to work around it

### Requirement: Full owned diff excludes unrelated work
General policy MUST require reviewing all final owned changes against the initial working state, including owned untracked files, while preserving unrelated pre-existing tracked/untracked work. It MUST NOT imply reviewing or staging every repository change indiscriminately.

#### Scenario: Dirty initial checkout
- **WHEN** unrelated changes exist before the task
- **THEN** retain them unchanged, verify the complete owned final scope and do not discard or silently stage unrelated work

### Requirement: Task sessions follow goals
Portable policy MUST require assessing chat/queue task continuity before work: shared goal stays, independent goal starts a fresh native session through the handoff tool, uncertain relation asks. First tasks in clean sessions and clarifications MUST NOT cause handoff loops. Only new-task essentials may transfer; unfinished work and checks MUST NOT be silently abandoned.

#### Scenario: Ordinary chat task
- **WHEN** a user submits an independent task outside TODO
- **THEN** the same continuity rule applies without creating a TODO entry for a discussion/small edit
