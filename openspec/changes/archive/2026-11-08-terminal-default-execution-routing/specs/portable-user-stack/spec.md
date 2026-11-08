## MODIFIED Requirements

### Requirement: Single managed terminal specialist
The build MUST pin pi-subagents 0.87.0 and install one managed terminal agent using openrouter/deepseek/deepseek-v4.1-flash-1017, preserving the parent model. Bundled roles, council/prompts, automatic per-change review, nesting and ambient child extensions MUST remain disabled. Terminal MUST be exempt from the multi-context threshold; other authorization and resource limits MUST remain. Tool selection MUST NOT imply OS isolation or inherited SSH routing.

#### Scenario: Preservation-mode deployment
- **WHEN** the approved installer runs with preserved settings
- **THEN** it adds the pinned filtered package and terminal settings while preserving unrelated settings, instructions and credentials, with recoverable pre-install backup

#### Scenario: Conflicting personal profile
- **WHEN** an existing managed terminal profile or config differs from the approved source
- **THEN** installation refuses replacement and retains the backup rather than silently overwriting user content

#### Scenario: Short execution assignment
- **WHEN** the parent assigns a bounded short non-production task under the standing terminal workflow
- **THEN** the profile accepts that scope without a multi-context prerequisite, while planning, production code and acceptance remain with the parent
