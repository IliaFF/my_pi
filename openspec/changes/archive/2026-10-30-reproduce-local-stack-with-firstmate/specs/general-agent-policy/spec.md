# Spec Delta

## MODIFIED Requirements

### Requirement: Task sessions follow goals
Outside Firstmate supervisor sessions, portable policy MUST require assessing chat/queue task continuity before work: shared goal stays, independent goal starts a fresh native session through the handoff tool, uncertain relation asks. First tasks in clean sessions and clarifications MUST NOT cause handoff loops. Only new-task essentials may transfer; unfinished work and checks MUST NOT be silently abandoned.

#### Scenario: Ordinary chat task
- **WHEN** a user submits an independent task outside TODO
- **THEN** the same continuity rule applies without creating a TODO entry for a discussion/small edit

#### Scenario: Firstmate supervisor session
- **WHEN** Firstmate owns the task lifecycle, including tool and queue instructions
- **THEN** the agent stays in its session instead of calling start_task_session merely for a new goal; unfinished work/checks remain protected in every session

### Requirement: Standing delegation text is decision focused
The permanent delegation section MUST retain eligibility, authorization, continuity and parent responsibility, but MUST NOT repeat lifecycle procedures or advertise a retired Pi plugin's help/discovery interface. Firstmate retains its project-scoped orchestration guidance.

#### Scenario: No lifecycle tool requested
- **WHEN** the standing prompt is built
- **THEN** it explains when delegation qualifies without embedding lifecycle, naming, routing or model-catalog details or pointing to an unavailable Pi plugin

## ADDED Requirements

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
