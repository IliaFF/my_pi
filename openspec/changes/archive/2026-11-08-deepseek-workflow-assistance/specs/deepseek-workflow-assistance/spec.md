## ADDED Requirements

### Requirement: Automatic assistance is model scoped
The managed workflow MUST default to auto mode, active only for a DeepSeek model id. Other models MUST receive no automatic classifier request, assistance section or correction. Explicit session-local on/off/auto choices MUST survive active-branch restore, including legacy explicit booleans.

#### Scenario: Switch away during classification
- **WHEN** the model changes from DeepSeek to another family while Jev is pending
- **THEN** the request is cancelled or invalidated and its late result cannot inject context or schedule another turn

#### Scenario: Ordinary non-DeepSeek session
- **WHEN** auto mode is used with a non-DeepSeek or unknown model
- **THEN** prompts/tools behave as before without automatic review or classification

### Requirement: Skill hydration uses the current trusted catalog
The workflow MUST select from SDK-discovered skills without a hardcoded language list, support multiple applicable skills and task continuations, and respect caller-established requirements. It MUST supply selected instruction files completely or report explicit omission, with source hashes. Classifier absence/failure MUST NOT masquerade as successful loading or disable ordinary skill discovery.

#### Scenario: A newly registered skill
- **WHEN** an arbitrary new catalog skill is selected for a task
- **THEN** its full instructions reach the provider request before the assistant acts without editing routing code

#### Scenario: Oversized or unsafe reference
- **WHEN** selected content exceeds the bound, is unavailable or references outside the permitted local root
- **THEN** the omission is visible, unrelated/private files are not read, and the system does not claim the reference was satisfied

### Requirement: Retrieval is scoped and does not create authority
The workflow MUST use bounded provenance-bearing retrieval from trusted current project context and permitted local skill references. It MUST NOT ingest arbitrary sessions, secrets or other projects, replace pinned rules/task ownership, execute scripts, or automatically fetch remote references.

#### Scenario: Untrusted project or escaping link
- **WHEN** project trust is absent or a reference resolves outside its permitted root
- **THEN** automatic retrieval refuses it and leaves a diagnostic reason without reading its body

### Requirement: Codemode is preferred without bypassing safeguards
Enabled workflow guidance MUST prefer codemode for useful multi-tool orchestration, independent batches and bounded processing, while preserving dependent decision boundaries, each outcome check and normal tool permissions/discovery. Appropriate single direct calls and no-tool answers MUST NOT automatically count as violations.

#### Scenario: Actual nested tool failure
- **WHEN** a real codemode script calls tools and a nested call fails or is blocked
- **THEN** the result remains observable as a failure and diagnostics retain parent-linked tool identity without script/argument bodies

### Requirement: Rule assessment is evidence based and bounded
The workflow MUST distinguish demonstrated violations from compliance, insufficient evidence and inapplicability. Classifier uncertainty, incomplete evidence and unavailable checks MUST NOT be reported as approval or automatically trigger a repair. A confirmed correction MUST remain bounded to one per user prompt and cannot authorize destructive/external actions, undo unrelated work or override deterministic failed checks.

#### Scenario: Fully preloaded skill without read call
- **WHEN** complete skill instructions were supplied before work and no model-authored read was necessary
- **THEN** the reviewer does not treat absence of a read call as missing instructions

#### Scenario: Repeated final boundaries
- **WHEN** tool loops, retries or a correction produce multiple settle events for one prompt
- **THEN** no more than one corrective continuation is scheduled and stale/aborted work cannot schedule any

### Requirement: Diagnostics support private reproducible review
Diagnostics MUST record bounded schema-versioned activation/routing/loading/retrieval/tool/review/failure/usage metadata, session/branch/request association and source hashes. They MUST exclude credentials, reasoning, raw prompts/file bodies/tool arguments and provider error bodies. Owner-only permissions, bounded size, visible omission/rotation and graceful diagnostic failure are required.

#### Scenario: Sensitive tool result and diagnostic limit
- **WHEN** a tool returns sensitive content or a log reaches its bound
- **THEN** the content is not copied into diagnostics and omissions/rotation are indicated rather than silently losing evidence

### Requirement: Lifecycle state does not leak across histories
The workflow MUST rebuild only current-branch state, invalidate obsolete asynchronous work and restore needed prompt context after compaction. Compaction itself MUST NOT call Jev or another model.

#### Scenario: Branch or compaction changes context
- **WHEN** an active branch changes or context is compacted
- **THEN** abandoned-branch requirements/feedback do not carry over and subsequent generation receives current applicable context without a compaction-time model request
