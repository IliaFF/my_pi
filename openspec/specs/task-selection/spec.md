# task-selection Specification

## Purpose
Honor explicit pending task identity and native tool errors without queue churn, preserving FIFO, atomic mutation and single-current protection.

## Requirements

### Requirement: Claim respects explicit task identity
The queue MUST select exactly the requested pending id without reordering remaining tasks. Omitted id MUST retain FIFO and existing generated-id behavior. A current task MUST still prevent another claim.

#### Scenario: Select second pending task
- **WHEN** claim supplies the second pending task id
- **THEN** only that task moves to In progress and the remaining order is unchanged

#### Scenario: Unknown or non-pending id
- **WHEN** claim supplies an absent, blocked, completed or blank id
- **THEN** the operation fails and TODO bytes remain unchanged

#### Scenario: No id
- **WHEN** claim omits id
- **THEN** the first pending task is selected as before

### Requirement: Tool failures remain failures
Queue tool failures MUST propagate through the native SDK error channel and MUST NOT be successful-looking text responses.

#### Scenario: Bad id on real SDK
- **WHEN** the actual queue tool executes a claim for an unknown id
- **THEN** the SDK records a failed tool execution and the file remains unchanged

### Requirement: Slash queue listing shows unfinished tasks only
The /queue and /queue list commands MUST show the current task, pending tasks and blocked tasks without a Completed section or completed task entries. Listings MUST NOT mutate TODO.md, change task order or launch an agent run. The task_queue action=list tool MUST retain completed history in both its text response and structured details.

#### Scenario: Mixed queue
- **WHEN** a TODO contains current, pending, blocked and completed tasks and either slash listing is invoked
- **THEN** the notification contains only unfinished tasks and existing status, while TODO bytes remain unchanged

#### Scenario: No unfinished tasks
- **WHEN** a TODO contains only completed history and either slash listing is invoked
- **THEN** the existing empty current/pending/blocked representation is displayed without completed history and without an agent run

#### Scenario: Agent inspects history
- **WHEN** task_queue action=list is invoked
- **THEN** completed tasks remain available in the text and structured details and TODO bytes remain unchanged

### Requirement: Compact panel reflects the authoritative project queue
Trusted TUI sessions MUST render a read-only, terminal-safe tree of unfinished tasks with exact counts/overflow and distinct status glyphs/colors. Preview MUST fit six rows and half the terminal (minimum one); native expansion MUST retain the half-height cap. /queue panel and Ctrl+Shift+T MUST toggle one-row collapse. Rendering MUST adapt without IO. TODO/order/model messages MUST stay unchanged; no extra store, dependencies, config or Completed/Deferred rows.

#### Scenario: Mixed and long queue
- **WHEN** current, pending, blocked and completed tasks exist, including wide characters and control sequences
- **THEN** rows show current, Pending FIFO, then Blocked with exact hidden counts, closed tree branches and native width clipping with ellipsis; current uses ◐ with accent/bold, Pending ○ with dim glyph, Blocked ! with warning; user controls and Completed/Deferred never render

#### Scenario: Collapse and expand
- **WHEN** the slash command or registered collapse shortcut is invoked twice
- **THEN** the same queue switches to one line and back without writes or model execution

#### Scenario: Resize and global expansion
- **WHEN** terminal height or native tools-expanded mode changes without a file event
- **THEN** the same widget immediately adjusts visible rows and overflow without a disk read; collapsed view remains one line

### Requirement: Panel refresh and disposal remain passive
The panel MUST refresh external TODO edits including atomic replacement and MUST stop its non-persistent watcher and clear its widget on shutdown/replacement/reload. Stale asynchronous reads MUST NOT repaint a disposed/replaced panel. Headless, RPC and untrusted sessions MUST NOT start a panel watcher. Missing or empty queues MUST hide the widget; parse/read errors MUST NOT leave stale tasks visible and MUST recover after correction.

#### Scenario: External atomic edit
- **WHEN** another editor/session replaces the watched TODO
- **THEN** the widget reflects new task text/counts without a command or model turn

#### Scenario: Lifecycle and non-TUI
- **WHEN** session is reloaded/shut down or started without trusted TUI
- **THEN** old watchers/widgets are removed and no non-TUI watcher or stale repaint occurs

#### Scenario: Missing or invalid file
- **WHEN** TODO is missing, empty, invalid or later corrected
- **THEN** no stale tasks remain and a corrected watched file can render again

### Requirement: Recorded checks are task-bound and snapshot-bound
The queue MUST bind check/checks to current task id/text, exact command/cwd, job id and bounded file fingerprints. Checks MUST use existing local process-only background tools and structured runner results, not logs or caller assertions. Checks MUST NOT poll, run agent jobs or adopt unrelated jobs. Completion MUST start or queue native model follow-up on success, nonzero exit and timeout without granting new permissions.

#### Scenario: Unchanged successful check
- **WHEN** a task starts a check, the runner exits successfully, and start/terminal-inspection/completion fingerprints agree
- **THEN** the record can support completion and includes actual job id and exit code

#### Scenario: Changed files or task
- **WHEN** a file is added, deleted, edited, mode-changed or the task text changes during/after a check
- **THEN** the old evidence cannot complete the task; snapshot failures and unavailable jobs are unknown, never PASS

#### Scenario: Pending, failed and repeated checks
- **WHEN** completion is attempted with a running job or latest failed/stale/unknown check
- **THEN** TODO remains unchanged; an explicit successful rerun can replace an earlier terminal failure for the same command/cwd

#### Scenario: Direct evidence and lifecycle isolation
- **WHEN** a task has never started recorded checks, or session/branch/task lifecycle changes
- **THEN** existing direct-evidence completion remains available for the former; records of a different lifecycle never authorize the latter

#### Scenario: Completion follow-up
- **WHEN** a recorded shell check succeeds, fails or times out
- **THEN** native completion notification starts or queues exactly one model continuation; inspecting checks/status does not duplicate it and never turns failure into PASS
