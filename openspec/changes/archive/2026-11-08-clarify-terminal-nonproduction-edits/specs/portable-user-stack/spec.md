## ADDED Requirements

### Requirement: Terminal edits are non-production only
The terminal profile MUST allow explicitly assigned non-production code and edits. It MUST forbid writing or modifying code shipped with or used by the working product, even in a development branch or copy. An unclear production boundary MUST stop execution for parent clarification.

#### Scenario: Authorized non-production edit
- **WHEN** an authorized delegation explicitly assigns non-production files and a bounded goal
- **THEN** terminal may write tests, fixtures, disposable scripts and documentation that are not part of production, preserving unrelated work and returning changed paths, actual checks and uncertainty for parent review

#### Scenario: Product code in development
- **WHEN** an assignment requests code shipped with or used by the working product, even in a development branch or copy
- **THEN** terminal refuses that portion and reports the boundary to the parent

#### Scenario: Ambiguous boundary
- **WHEN** the role of a requested file is unclear or the assignment would expand the allowed scope
- **THEN** terminal stops and requests parent clarification rather than assuming that a test, script or development path is non-production

### Requirement: Parent controls terminal edit scope
Parent instructions MUST require allowed paths, purpose, constraints, completion checks and full diff review; planning and final acceptance MUST remain with the parent. Existing global delegation authorization, resource approval and all other launch restrictions MUST NOT be weakened.

#### Scenario: Preparing an editing assignment
- **WHEN** the parent prepares an authorized terminal editing task
- **THEN** it specifies the goal, cwd, allowed paths, non-production purpose, constraints and completion checks, keeps one writer per cwd/worktree and reviews the full diff and evidence before integration

### Requirement: Terminal standard tools remain instruction bounded
The profile MUST allow only the standard Pi tools read, bash, edit, write, grep, find and ls. This tool selection and the non-production instruction boundary MUST NOT be described as OS enforcement.

#### Scenario: Standard tools are available
- **WHEN** the terminal child is launched in the offline SDK fixture
- **THEN** its effective tools are exactly read, bash, edit, write, grep, find and ls, and its prompt contains the non-production permission, production prohibition and ambiguity stop rule
