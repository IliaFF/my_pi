## ADDED Requirements

### Requirement: Terminal is the default non-production executor
Standing policy MUST route coherent non-production execution assignments to DeepSeek terminal by default, including short tasks without a multi-context threshold. GPT MUST retain planning, product decisions, production code and final acceptance. Necessary parent source/evidence inspection MUST remain allowed. Other delegation MUST retain its multi-context eligibility rules.

#### Scenario: Routine short task
- **WHEN** a task needs bounded file search, command execution, tests, diagnostics, non-production scripts or documentation
- **THEN** the parent assigns a coherent bounded package to terminal rather than doing routine execution itself or spawning a child for each command

#### Scenario: Product change
- **WHEN** the task requires writing or modifying production code
- **THEN** GPT owns that code while terminal may execute separately scoped non-production work and reports product decisions or ambiguous boundaries back to GPT

### Requirement: Default routing preserves authority and fallback limits
Standing authorization MUST cover routine terminal delegation only within the current assignment and approved model budget. It MUST NOT grant new providers, unlimited spend, SSH, installations, destructive actions or production operations. Substantial resource growth MUST still require direct user approval. Unavailable terminal MUST NOT cause silent fallback to parent routine execution.

#### Scenario: Executor unavailable
- **WHEN** terminal cannot execute an assigned package
- **THEN** the parent reports the limitation and agrees an alternative with the user rather than silently changing executor or widening authority

#### Scenario: Additional resources or authority
- **WHEN** a terminal assignment would require new services, substantial extra resources or separately restricted operations
- **THEN** the executor stops at that boundary and the parent obtains the required authorization rather than treating default routing as approval

## MODIFIED Requirements

### Requirement: Standing delegation text is decision focused
The permanent delegation section MUST retain eligibility, authorization, continuity and parent responsibility, including the operator-approved GPT/terminal division of work. Apart from that standing workflow, it MUST NOT repeat lifecycle procedures, model catalogs or advertise a retired Pi plugin's help/discovery interface. Firstmate retains its project-scoped orchestration guidance.

#### Scenario: No lifecycle tool requested
- **WHEN** the standing prompt is built
- **THEN** it explains delegation eligibility and the default terminal role without embedding lifecycle procedures, model catalogs or pointing to an unavailable Pi plugin
