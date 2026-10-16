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
Trusted TUI sessions MUST show a read-only widget above the editor with current task, Pending/Blocked counts, up to three next pending tasks in FIFO order and an overflow count. Expanded output MUST contain at most six width-bounded terminal-safe rows. Completed and deferred tasks MUST NOT render. `/queue panel` MUST toggle a one-line count view without changing TODO, task order or model messages. No additional task storage or dependency MUST be introduced.

#### Scenario: Mixed and long queue
- **WHEN** current, pending, blocked and completed tasks exist, including wide characters and control sequences
- **THEN** panel rows show the current/FIFO subset and exact counts within the terminal width, without controls or completed history

#### Scenario: Collapse and expand
- **WHEN** the user executes /queue panel twice
- **THEN** the same queue switches to one line and back without writes or model execution

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
