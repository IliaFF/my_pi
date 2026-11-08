## ADDED Requirements

### Requirement: Single managed terminal specialist
The build MUST pin pi-subagents 0.87.0 and install one managed terminal agent using openrouter/deepseek/deepseek-v4.1-flash-1017, without changing the preserved parent model. Bundled agents, council/prompts, automatic per-change review, nested delegation and ambient child extensions MUST remain disabled. Global delegation authorization and multi-context threshold MUST NOT be weakened. Bash tool selection MUST NOT be represented as OS isolation or inherited SSH routing.

#### Scenario: Preservation-mode deployment
- **WHEN** the approved installer runs with preserved settings
- **THEN** it adds the pinned filtered package and terminal settings while preserving unrelated settings, instructions and credentials, with recoverable pre-install backup

#### Scenario: Conflicting personal profile
- **WHEN** an existing managed terminal profile or config differs from the approved source
- **THEN** installation refuses replacement and retains the backup rather than silently overwriting user content
