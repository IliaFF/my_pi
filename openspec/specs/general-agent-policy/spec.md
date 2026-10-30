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
Outside Firstmate supervisor sessions, portable policy MUST require assessing chat/queue task continuity before work: shared goal stays, independent goal starts a fresh native session through the handoff tool, uncertain relation asks. First tasks in clean sessions and clarifications MUST NOT cause handoff loops. Only new-task essentials may transfer; unfinished work and checks MUST NOT be silently abandoned.

#### Scenario: Ordinary chat task
- **WHEN** a user submits an independent task outside TODO
- **THEN** the same continuity rule applies without creating a TODO entry for a discussion/small edit

#### Scenario: Firstmate supervisor session
- **WHEN** Firstmate owns the task lifecycle, including tool and queue instructions
- **THEN** the agent stays in its session instead of calling start_task_session merely for a new goal; unfinished work/checks remain protected in every session

### Requirement: Workflow prose has one owning layer
The build MUST consolidate repeated background and task-session instructions while retaining safety, exact-scope evidence, authoritative TODO ordering and goal-based handoff. Restoration MUST use current TODO for tracked work and summary/focused history retrieval for other details, without requiring emergency packets or a recovery-marker protocol. Reports MUST measure bytes rather than infer speed or quality.

#### Scenario: Reduced standing policy
- **WHEN** APPEND and tool guidelines are assembled
- **THEN** the handoff tool owns its detailed contract, background inspection rules are compact, and task-conditional restoration remains available without packet/marker instructions

#### Scenario: Background safety remains explicit
- **WHEN** background tool instructions are assembled
- **THEN** they retain process-only admission, local unsandboxed execution warnings, finite deadlines/output bounds, notification and wake opt-outs, no polling, bounded inspection exceptions and cancellation/reload limits

### Requirement: Delegation details have one owning layer
Permanent prompt MUST keep delegation decision semantics and essential execution restrictions. Rare lifecycle/configuration/model catalog detail MAY live in the operating skill and deferred tool definitions. Tool-list snippets MUST NOT duplicate the full subagent/resume descriptions. Deferred discovery MUST NOT weaken authorization, no-polling, native task handoff or queue checks.

#### Scenario: Ordinary coding without delegation
- **WHEN** the initial prompt is assembled
- **THEN** permanent decision/safety rules remain but inactive Herdr schemas and repeated lifecycle prose are absent

### Requirement: Standing delegation text is decision focused
The permanent delegation section MUST retain eligibility, authorization, continuity and parent responsibility, but MUST NOT repeat lifecycle procedures or advertise a retired Pi plugin's help/discovery interface. Firstmate retains its project-scoped orchestration guidance.

#### Scenario: No lifecycle tool requested
- **WHEN** the standing prompt is built
- **THEN** it explains when delegation qualifies without embedding lifecycle, naming, routing or model-catalog details or pointing to an unavailable Pi plugin

### Requirement: SSH work uses the available Pi tool
Permanent policy MUST direct SSH work to Pi's `remote` tool, discovered through `tool_search` when absent from current declarations. It MUST state that read/write/edit/bash use active SSH routing without duplicating the tool's detailed contract.

#### Scenario: Deferred SSH tool
- **WHEN** SSH work is needed and remote is not declared yet
- **THEN** the standing prompt points to native discovery and remote, while its executor and authorization remain unchanged

#### Scenario: Offline prompt verification
- **WHEN** the SDK regression assembles the permanent prompt
- **THEN** the SSH discovery/routing reminder is present without making a live connection

### Requirement: Unclear details use bounded session history
When a relevant agreement or restriction is missing or contradictory after compaction, permanent policy MUST direct the agent to existing summary/files and focused recall, then to selected messages on the active branch of the session ledger identified by the summary when recall is insufficient. It MUST forbid whole-session dumps and secret disclosure, retain current instructions/TODO authority, and require clarification rather than guessing when history or task identity remains unclear.

#### Scenario: Constraint outside recall coverage
- **WHEN** a later-line user restriction is absent from the summary and recall results
- **THEN** the agent is instructed to inspect only relevant active-branch ledger messages and ask if evidence remains insufficient, without treating missing recall hits as proof of absent restrictions

#### Scenario: Existing task restoration
- **WHEN** tracked work resumes after any compaction
- **THEN** current TODO remains authoritative and unavailable TODO or unclear task identity still stops work for clarification

### Requirement: Resource expansion requires direct user approval
Portable global AGENTS MUST contain the user-approved resource and effort consent rule, independently of APPEND_SYSTEM. A goal or supervisor approval MUST NOT authorize substantial extra resources. New source templates MUST contain the full rule only in AGENTS, avoiding duplicate default prompt text. Existing private APPEND content MUST remain unchanged in preservation mode.

#### Scenario: Project overrides APPEND
- **WHEN** a trusted Firstmate project supplies APPEND_SYSTEM
- **THEN** the resource consent rule still appears exactly once through global AGENTS

#### Scenario: Existing Firstmate section
- **WHEN** an existing profile contains the identical Firstmate section and unrelated private sections
- **THEN** only the missing resource section is appended, repeat installation changes no bytes, and any conflicting managed section causes refusal before writing AGENTS

### Requirement: Firstmate exception survives project append override
Global context instructions MUST retain the Firstmate task-switch exception independently of APPEND_SYSTEM. Permanent APPEND MUST NOT require the removed pi-herdr-agents routing paragraph. Other policy text MUST remain unchanged.

#### Scenario: Project append replaces global append
- **WHEN** trusted project APPEND_SYSTEM takes precedence
- **THEN** global AGENTS still states the Firstmate exception without host addresses, SSH configuration or credentials
