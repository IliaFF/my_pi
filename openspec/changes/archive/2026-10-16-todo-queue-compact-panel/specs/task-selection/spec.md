## ADDED Requirements

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
