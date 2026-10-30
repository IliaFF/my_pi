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

### Requirement: Queue dispatch assesses before claim
Queue next/run and auto-advance MUST present the selected FIFO candidate for goal-based continuity assessment before claiming it. The agent MUST clarify ambiguity or start the unrelated task in a fresh session before claim. Resume MUST keep its current task. Explicit claim identity, remaining order, safety limit and single-current protection MUST remain intact.

#### Scenario: Candidate assessment
- **WHEN** queue dispatch selects a pending candidate
- **THEN** TODO is unchanged until an explicit successful claim after continuity assessment

#### Scenario: Resume or related next task
- **WHEN** work resumes or the candidate shares the current goal
- **THEN** the session stays and normal current-task/auto-run accounting applies

#### Scenario: Auto-run crosses a session boundary
- **WHEN** an independent candidate moves to a fresh session during queue run
- **THEN** only the remaining five-task budget transfers, it cannot reset to zero or restart on reload, and pending order/check isolation remain intact

### Requirement: Obsolete passed checks can be explicitly superseded
The queue MUST allow the current task to explicitly supersede an obsolete stable successful check with a fresh successful latest check for the same task id/text and cwd, with a nonempty reason. Both records and reason MUST remain in the session ledger. No project files or task states may change.

#### Scenario: Archive changes the check command
- **WHEN** a successful pre-archive check becomes stale and a successful post-archive check covers the current snapshot
- **THEN** explicit supersede records the reason, preserves both checks, and completion may succeed only if all other required checks are satisfied

#### Scenario: Invalid replacement
- **WHEN** replacement is missing, stale, failed, running, invalidated, foreign, another cwd or not latest, or the reason is empty
- **THEN** the tool fails without a new supersession record, TODO change or background launch

### Requirement: Supersession retains check safety guards
Running, failed, unknown, invalidated, foreign and unstable checks MUST NOT be bypassed, except explicit replacement of a provably unstarted failed preflight as specified separately. Replacement chains MUST terminate at a fresh successful latest check without missing links or cycles. Unrelated required checks and the global running-check guard remain mandatory. Cross-cwd replacement MUST remain forbidden for executed checks.

#### Scenario: Failed check cannot be hidden
- **WHEN** a different passing command is proposed to replace a launched failed or unstable check
- **THEN** replacement fails and the original command still requires a successful rerun

### Requirement: Failed preflight can be explicitly replaced without erasing evidence
The queue MUST allow explicit reasoned supersession of a current matching task's latest snapshot failure that has status unknown, an error, no before fingerprint and no job identity, by a fresh stable successful latest check. Only this provably unstarted case MAY cross cwd. The original record MUST remain and MUST NOT authorize completion without replacement. Ambiguous or launched unknown checks MUST retain rerun requirements.

#### Scenario: Snapshot failed before shell launch
- **WHEN** a failed preflight scope cannot be scanned and a successful narrower-scope check is explicitly linked with a reason
- **THEN** supersede and complete can validate the replacement without reading the old scope, while preserving both records

#### Scenario: Failure after launch or ambiguous interruption
- **WHEN** a check has a before fingerprint or job identity, or an unknown record lacks an error
- **THEN** the preflight exception is rejected without mutation or shell execution

### Requirement: Completion validates replacement endpoints only
Completion MUST fingerprint the latest unsuperseded endpoint scopes instead of obsolete replaced scopes. All task/text/latest/lifecycle, chain validity, stable-success, freshness and global running guards MUST remain; a missing, foreign, invalidated or cyclic replacement MUST fail.

#### Scenario: Obsolete cwd becomes unavailable
- **WHEN** a replaced preflight directory no longer exists but the replacement scope is unchanged
- **THEN** complete succeeds without rescanning the obsolete directory

### Requirement: Explicit Blocked recovery starts a fresh checked lifecycle
The queue MUST support explicit reopen of a Blocked id with a nonempty reason only when there is no current task and no running check of that id. It MUST preserve task identity/text, remaining order, old session records and atomic TODO mutation. Reopen MUST NOT run a shell, model or auto-run, and MUST require a fresh recorded check before completion, including after session restoration. Old checks MUST NOT authorize the reopened lifecycle.

#### Scenario: Recover historical Blocked task
- **WHEN** a valid Blocked id is reopened with a reason
- **THEN** it becomes the unique current task, Pending order is unchanged and completion without a new check fails

#### Scenario: Unsafe reopen
- **WHEN** current is occupied, reason is empty, id is not Blocked or its check is running
- **THEN** reopen fails without TODO mutation
