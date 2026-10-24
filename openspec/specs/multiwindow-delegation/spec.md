# multiwindow-delegation Specification

## Purpose
Reserve delegation for independent tasks that exceed one managed context window, and require explicit evidence that long-lived executors preserve context and recovery boundaries before activation.

## Requirements

### Requirement: Delegation has a managed multi-window threshold
The agent MUST delegate only independent tasks forecast to exceed one context window after folding, recall and compaction. One-window scouts and prototypes MUST remain in the parent. Large files or elapsed time alone MUST NOT qualify. Unclear user intent MUST be clarified.

#### Scenario: Bounded local work
- **WHEN** investigation or a prototype fits in one managed context window
- **THEN** the parent does it without a child

#### Scenario: Independent large task
- **WHEN** a task is forecast to exceed one managed window and has explicit boundaries and verifiable output
- **THEN** it may be delegated before overflowing, subject to execution authorization; the child must retain goal, constraints, progress and evidence across context cycles

### Requirement: Delegation preserves execution boundaries
The policy MUST NOT authorize agent execution via the shell-only background pilot or replace sequential native task handoff. Executors MUST retain goals, constraints, progress and evidence across context cycles.

#### Scenario: Policy is not activation
- **WHEN** the threshold policy is recorded
- **THEN** installed packages, credentials, background admission and native handoff remain unchanged

### Requirement: Candidate evidence distinguishes persistence from context continuity
Evaluation MUST compare pinned Herdr and Durable candidates without production activation, copied credentials or external model calls. It MUST distinguish source inspection, upstream faux tests, actual SDK checks and untested live autonomous work. It MUST disclose context-stack inheritance, compaction, multi-window continuity, shutdown/restart behavior, unsafe replay and permission limits. A saved history or a long-lived process MUST NOT be reported as proof of working multi-window execution.

#### Scenario: Durable history without parent extensions
- **WHEN** a candidate persists conversations but does not inherit the current context extensions
- **THEN** this limitation is explicit and it is not approved as an equivalent executor without further evidence

#### Scenario: Faux recovery passes
- **WHEN** restart and compaction tests pass using a faux provider
- **THEN** evidence is limited to those scenarios, with autonomous multi-window quality, real provider recovery and integration explicitly unverified
