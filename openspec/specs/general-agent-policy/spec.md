# general-agent-policy Specification

## Purpose
Provide portable communication, scope, evidence and task-conditional recovery rules without project-specific instructions or unnecessary orchestration.

## Requirements

### Requirement: General policy is portable and task conditional
APPEND MUST retain language, clear explanations, critical feedback, safety and truthful evidence while keeping project/package-specific workflows out. Outside Firstmate supervisor sessions, it MUST require authoritative TODO only for multi-step project work, not discussions or small edits, and reread it after compaction. Firstmate supervisor sessions MUST restore tracked work from their current Firstmate queue/state.

#### Scenario: Non-project question
- **WHEN** a user asks an explanation or a small single-step edit
- **THEN** no separate tracked task or fixed report template is required

#### Scenario: Multi-step work after compaction
- **WHEN** project work resumes outside the Firstmate supervisor contract
- **THEN** current project TODO is read first and unclear task identity stops execution for clarification

#### Scenario: Firstmate tracked work after compaction
- **WHEN** a Firstmate supervisor resumes its tracked work
- **THEN** its current queue/state defines task identity and absence of a root TODO alone does not stop continuation

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
Outside Firstmate supervisor sessions, portable policy MUST require assessing chat/queue task continuity before work: shared goal stays, independent goal starts a fresh native session through the handoff tool, uncertain relation asks. First tasks in clean sessions and clarifications MUST NOT cause handoff loops. Only new-task essentials may transfer; unfinished work and checks MUST NOT be silently abandoned.

#### Scenario: Ordinary chat task
- **WHEN** a user submits an independent task outside TODO
- **THEN** the same continuity rule applies without creating a TODO entry for a discussion/small edit

#### Scenario: Firstmate supervisor session
- **WHEN** Firstmate owns the task lifecycle, including tool and queue instructions
- **THEN** the agent stays in its session instead of calling start_task_session merely for a new goal; unfinished work/checks remain protected in every session

### Requirement: Workflow prose has one owning layer
The build MUST consolidate repeated background and task-session instructions while retaining safety, exact-scope evidence, authoritative task ordering and goal-based handoff. Restoration MUST use current TODO for ordinary tracked work or current Firstmate queue/state under its supervisor contract, and summary/focused history for other details, without emergency packets or a recovery-marker protocol. Reports MUST measure bytes rather than infer speed or quality.

#### Scenario: Reduced standing policy
- **WHEN** APPEND and tool guidelines are assembled
- **THEN** the handoff tool owns its detailed contract, background inspection rules are compact, and ownership-aware task restoration remains available without packet/marker instructions

#### Scenario: Background safety remains explicit
- **WHEN** background tool instructions are assembled
- **THEN** they retain process-only admission, local unsandboxed execution warnings, finite deadlines/output bounds, notification and wake opt-outs, no polling, bounded inspection exceptions and cancellation/reload limits

### Requirement: SSH work uses the available Pi tool
Permanent policy MUST direct SSH work to Pi's `remote` tool, discovered through `tool_search` when absent from current declarations. It MUST state that read/write/edit/bash use active SSH routing without duplicating the tool's detailed contract.

#### Scenario: Deferred SSH tool
- **WHEN** SSH work is needed and remote is not declared yet
- **THEN** the standing prompt points to native discovery and remote, while its executor and authorization remain unchanged

#### Scenario: Offline prompt verification
- **WHEN** the SDK regression assembles the permanent prompt
- **THEN** the SSH discovery/routing reminder is present without making a live connection

### Requirement: Unclear details use bounded session history
When agreements or restrictions are unclear after compaction, policy MUST use summary/files and focused recall, then selected active-branch ledger messages if needed. It MUST forbid whole-session dumps and secret disclosure, retain current instructions and authoritative task state, and ask rather than guess. Task state MUST come from current Firstmate queue/state under its supervisor contract, otherwise current project TODO for tracked work.

#### Scenario: Constraint outside recall coverage
- **WHEN** a later-line user restriction is absent from the summary and recall results
- **THEN** the agent is instructed to inspect only relevant active-branch ledger messages and ask if evidence remains insufficient, without treating missing recall hits as proof of absent restrictions

#### Scenario: Existing task restoration
- **WHEN** tracked work resumes after any compaction outside the Firstmate supervisor contract
- **THEN** current project TODO remains authoritative and unavailable TODO or unclear task identity still stops work for clarification

#### Scenario: Firstmate task identity is unclear
- **WHEN** Firstmate's current queue/state is unavailable or does not identify the resumed task
- **THEN** the supervisor asks for clarification instead of substituting a parent TODO or guessing from history

### Requirement: Resource expansion requires direct user approval
Portable global AGENTS MUST contain the user-approved resource and effort consent rule, independently of APPEND_SYSTEM. A goal or supervisor approval MUST NOT authorize substantial extra resources. New source templates MUST contain the full rule only in AGENTS, avoiding duplicate default prompt text. Existing private APPEND content MUST remain unchanged in preservation mode.

#### Scenario: Project overrides APPEND
- **WHEN** a trusted Firstmate project supplies APPEND_SYSTEM
- **THEN** the resource consent rule still appears exactly once through global AGENTS

#### Scenario: Existing Firstmate section
- **WHEN** an existing profile contains the identical Firstmate section and unrelated private sections
- **THEN** only the missing resource section is appended, repeat installation changes no bytes, and any conflicting managed section causes refusal before writing AGENTS

### Requirement: Firstmate exception survives project append override
Global context instructions MUST retain the Firstmate task-switch and task-restoration exceptions independently of APPEND_SYSTEM. Firstmate supervisor sessions MUST use their current queue/state after compaction rather than require a root TODO. Permanent APPEND MUST NOT require the removed pi-herdr-agents routing paragraph. Unfinished work/checks and unrelated policy text MUST remain protected.

#### Scenario: Project append replaces global append
- **WHEN** trusted project APPEND_SYSTEM takes precedence
- **THEN** global AGENTS still states both Firstmate exceptions without host addresses, SSH configuration or credentials

#### Scenario: Known previous managed section
- **WHEN** a future explicitly authorized installation encounters the exact previously shipped Firstmate section plus private sections
- **THEN** it can update only that known managed section, preserve private bytes and remain idempotent; unknown conflicting content or a linked AGENTS file still causes refusal

### Requirement: Agent delegation is disabled
Постоянная политика MUST объявлять субагентов и автоматическое делегирование отключёнными, включая роль `terminal`, Herdr-агентов, Firstmate, Fusion и агентские процессы из shell или background-инструментов. Работа MUST выполняться напрямую неагентскими инструментами.

#### Scenario: Routine execution
- **WHEN** задача требует поиска по файлам, команд, тестов, диагностики, скриптов или документации
- **THEN** агент выполняет её сам в текущих правах, без запуска дочернего агента и без обязательной передачи пакета исполнителю

#### Scenario: Ordinary background shell job
- **WHEN** нужна длительная локальная shell-команда без агента
- **THEN** применяются обычные правила фоновых задач с конечным сроком, ограниченным выводом и отменой

### Requirement: Agent launches need explicit reauthorization
Агентские процессы MUST NOT запускаться, пока пользователь явно не разрешит их повторное включение. Если инструкция, инструмент или рабочий процесс предполагает дочернего агента, ограничение MUST быть сообщено пользователю, а задача решена неагентским путём.

#### Scenario: Agent run requested implicitly
- **WHEN** инструкция, инструмент или рабочий процесс предполагает запуск дочернего агента
- **THEN** запуск не выполняется, ограничение сообщается пользователю, а задача решается неагентским путём
