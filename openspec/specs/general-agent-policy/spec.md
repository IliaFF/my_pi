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
The permanent delegation section MUST retain eligibility, authorization, continuity, parent responsibility and a discovery pointer, but MUST NOT repeat the discovered lifecycle completion procedure.

#### Scenario: No lifecycle tool requested
- **WHEN** the standing prompt is built
- **THEN** it explains when delegation qualifies and how to discover help without embedding lifecycle, naming, routing or model-catalog details

### Requirement: SSH work uses the available Pi tool
Permanent policy MUST direct SSH work to Pi's `remote` tool, discovered through `tool_search` when absent from current declarations. It MUST state that read/write/edit/bash use active SSH routing without duplicating the tool's detailed contract.

#### Scenario: Deferred SSH tool
- **WHEN** SSH work is needed and remote is not declared yet
- **THEN** the standing prompt points to native discovery and remote, while its executor and authorization remain unchanged

#### Scenario: Offline prompt verification
- **WHEN** the SDK regression assembles the permanent prompt
- **THEN** the SSH discovery/routing reminder is present without making a live connection
