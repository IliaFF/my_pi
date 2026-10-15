## ADDED Requirements

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
