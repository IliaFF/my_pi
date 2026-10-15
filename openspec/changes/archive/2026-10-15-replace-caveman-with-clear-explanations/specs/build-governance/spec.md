## ADDED Requirements

### Requirement: Clear explanations preserve implementation discipline
The build MUST not declare or load Caveman after approved removal. Communication policy MUST request clear full-sentence explanations with direct answers, relevant mechanism/reasons/consequences, examples when useful and distinct verified facts/assumptions. Only operational progress notifications default to brief. Ponytail and safety/validation requirements MUST remain unchanged. Private instructions MUST be preserved outside the explicitly added communication block.

#### Scenario: Fresh offline session after removal
- **WHEN** the updated source/runtime starts without a user prompt
- **THEN** Caveman package and command are absent, Ponytail and queue remain available, and no model request is made

#### Scenario: Existing personal policy
- **WHEN** the new communication block is added
- **THEN** all existing private policy text outside that block remains byte-identical and backup is available

#### Scenario: Explanation quality
- **WHEN** static checks and offline startup pass
- **THEN** they are reported as loading/policy verification, not proof of improved live explanations or token savings

#### Scenario: Historical Caveman patch backup
- **WHEN** a verified pre-removal backup contains the retired pi-caveman/package.json and pi-caveman/extensions/caveman.ts payloads
- **THEN** rollback accepts those exact destinations without accepting arbitrary new paths
