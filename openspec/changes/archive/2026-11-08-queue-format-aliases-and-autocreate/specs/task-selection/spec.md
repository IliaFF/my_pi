## MODIFIED Requirements

### Requirement: Project TODO discovery cannot escape its project
Queue discovery MUST search from the canonical working directory through the nearest enclosing project root inclusively, never above it, where the project root is the nearest ancestor containing `.git` or `AGENTS.md`; without such a marker it MUST use only the starting directory. Discovery MUST NOT resolve a TODO outside that boundary or silently substitute another queue on read/access failure. All queue consumers MUST use this boundary.

#### Scenario: Nested directory in one worktree
- **WHEN** a nested directory has no TODO and its enclosing Git worktree root contains one
- **THEN** discovery selects that root TODO and preserves existing nested-directory workflows

#### Scenario: Nested directory in a marked non-Git project
- **WHEN** a non-Git project root contains `AGENTS.md` and `TODO.md`, and the session starts in a nested directory without a local TODO
- **THEN** discovery selects the project-root TODO

#### Scenario: Missing TODO inside repository
- **WHEN** a repository has no TODO in the permitted search range but its parent directory contains a TODO
- **THEN** queue commands/tools report no project TODO without reading or mutating the parent queue, the panel shows no foreign tasks and handoff is not blocked by foreign current tasks

#### Scenario: Nested independent repository
- **WHEN** the working directory is inside an inner repository without a TODO and the outer repository has a TODO
- **THEN** discovery stops at the inner repository root without inheriting the outer queue

#### Scenario: Linked Git worktree
- **WHEN** the nearest worktree uses a .git file rather than a .git directory
- **THEN** its root is still the boundary and the main worktree's queue is not substituted

#### Scenario: Unmarked non-Git directory
- **WHEN** a non-Git working directory has neither `.git` nor `AGENTS.md` at or above it and has no local TODO
- **THEN** discovery reports no project TODO and does not inherit an ancestor queue

#### Scenario: Non-Git directory
- **WHEN** a non-Git working directory has no local TODO but an unmarked ancestor has one
- **THEN** discovery reports no project TODO; starting in the ancestor itself can use its local TODO

#### Scenario: Canonical path boundary
- **WHEN** the working directory is an alias or a candidate TODO resolves through a link
- **THEN** discovery enforces the canonical project boundary and never exposes an outside TODO

#### Scenario: Access failure
- **WHEN** a discovered in-project TODO is unreadable or otherwise unusable
- **THEN** the operation reports failure without falling through to an unrelated queue or mutating any TODO

## ADDED Requirements

### Requirement: Missing project queue is created on demand
A trusted TUI session and any queue-mutating command or tool MUST create the standard queue (`# TODO` plus the four empty sections) at the project root when discovery finds no TODO inside the boundary. Creation MUST use an exclusive write, keep an existing file untouched, and re-read the created file through normal discovery. Creation MUST NOT happen at the filesystem root, the home directory or the temporary directory, and MUST NOT happen for an existing but unusable TODO.

#### Scenario: Session starts in a project without TODO
- **WHEN** a trusted TUI session starts in a project root that contains `AGENTS.md` but no `TODO.md`
- **THEN** `TODO.md` with four empty sections appears at that root, the panel stays hidden because the queue is empty, and `/queue add` and the `task_queue` tool work without further setup

#### Scenario: Subdirectory of a marked project
- **WHEN** a trusted TUI session starts in a nested directory whose marked project root has no TODO
- **THEN** the queue file is created at the project root, not in the nested directory

#### Scenario: Protected locations
- **WHEN** a session starts in the home directory, the filesystem root or the temporary directory without a project marker
- **THEN** no TODO file is created and the queue stays unavailable with the existing not-found error

#### Scenario: Existing or unusable file
- **WHEN** a TODO exists but is unreadable, a directory or an external link
- **THEN** creation does not happen and the existing error is reported

#### Scenario: Headless and untrusted sessions
- **WHEN** the session is not a trusted TUI session
- **THEN** no queue file is created

### Requirement: Section spellings of one logical section form one group
Queue parsing MUST accept the section aliases `В работе`, `Ожидает`, `Блокировано` and `Завершено` for `In progress`, `Pending`, `Blocked` and `Completed`. Repeating one spelling MUST stay an error. Different spellings of one logical section MUST merge into a single group whose insertion point is the Latin heading when present, otherwise the first heading of the group.

#### Scenario: Russian headers with checkbox tasks
- **WHEN** a TODO uses `## Ожидает` and `## Завершено` with `- [ ]` / `- [x]` entries
- **THEN** pending and completed tasks are reported and claim/complete work as with the Latin headings

#### Scenario: Both spellings in one file
- **WHEN** a file contains `## Ожидает` with plain entries and later `## Pending` with checkbox entries
- **THEN** both groups' unfinished tasks are listed in document order and a new task is appended under `## Pending`

#### Scenario: Repeated heading spelling
- **WHEN** the same heading spelling appears twice in one file
- **THEN** parsing fails closed with the duplicate-section error

### Requirement: Plain bullets count only in active sections
A plain bullet (`- text` without a checkbox) MUST count as an unfinished task only inside `In progress`, `Pending`, `Blocked` and their aliases; `Completed` MUST keep requiring `- [x]`. Mutations MUST rewrite the touched task in canonical checkbox form.

#### Scenario: Plain bullets in active section
- **WHEN** `## Ожидает` contains `- Скачать CSV` without a checkbox and `## Завершено` contains plain `-` history entries
- **THEN** the plain pending entry is listed and claimable, while the plain completed entries never become tasks
