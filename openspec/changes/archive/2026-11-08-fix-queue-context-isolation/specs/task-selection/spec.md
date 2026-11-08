## ADDED Requirements

### Requirement: Project TODO discovery cannot escape its project
Queue discovery MUST search from the canonical working directory through the nearest enclosing Git worktree root inclusively, never above it. Without an enclosing Git worktree, it MUST use only the starting directory. Discovery MUST NOT resolve a TODO outside that boundary, mutate files, create a queue or silently substitute another queue on read/access failure. All queue consumers MUST use this boundary.

#### Scenario: Nested directory in one worktree
- **WHEN** a nested directory has no TODO and its enclosing Git worktree root contains one
- **THEN** discovery selects that root TODO and preserves existing nested-directory workflows

#### Scenario: Missing TODO inside repository
- **WHEN** a repository has no TODO in the permitted search range but its parent directory contains a TODO
- **THEN** queue commands/tools report no project TODO without reading or mutating the parent queue, the panel shows no foreign tasks and handoff is not blocked by foreign current tasks

#### Scenario: Nested independent repository
- **WHEN** the working directory is inside an inner repository without a TODO and the outer repository has a TODO
- **THEN** discovery stops at the inner repository root without inheriting the outer queue

#### Scenario: Linked Git worktree
- **WHEN** the nearest worktree uses a .git file rather than a .git directory
- **THEN** its root is still the boundary and the main worktree's queue is not substituted

#### Scenario: Non-Git directory
- **WHEN** a non-Git working directory has no local TODO but an ancestor has one
- **THEN** discovery reports no project TODO; starting in the ancestor itself can use its local TODO

#### Scenario: Canonical path boundary
- **WHEN** the working directory is an alias or a candidate TODO resolves through a link
- **THEN** discovery enforces the canonical project boundary and never exposes an outside TODO

#### Scenario: Access failure
- **WHEN** a discovered in-project TODO is unreadable or otherwise unusable
- **THEN** the operation reports failure without falling through to an unrelated queue or mutating any TODO
