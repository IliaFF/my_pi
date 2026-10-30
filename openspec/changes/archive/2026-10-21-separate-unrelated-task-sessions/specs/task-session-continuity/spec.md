## ADDED Requirements

### Requirement: Task continuity is goal based
Before starting a task from chat or TODO queue, the agent MUST assess whether it shares the previous goal. Related work MUST stay; unrelated work MUST use a fresh session; ambiguity MUST ask the user. The existing model makes the assessment; no extra model, heuristic classifier or automatic deployment is introduced.

#### Scenario: Same goal in one repo
- **WHEN** the next request fixes/tests/extends the same goal
- **THEN** it stays in the current session

#### Scenario: Different goal in the same repo
- **WHEN** the next task is independent even in the same repo
- **THEN** it starts and executes in a fresh native Pi session

#### Scenario: Unclear relation
- **WHEN** the agent cannot establish continuity
- **THEN** it asks the user and does not switch until clarified

### Requirement: Session handoff is native and bounded
Handoff MUST use a native command-only session replacement after idle, fresh withSession context and parent linkage. It MUST terminate old task execution, preserve the old session and send only a self-contained new request/necessary constraints. It MUST NOT copy old conversation, spawn Pi/subagents, discard queued messages or silently move unfinished queue tasks.

#### Scenario: Unrelated chat
- **WHEN** the agent requests handoff
- **THEN** the new session has a different id/file and automatically executes the new request without old messages

#### Scenario: Cancellation or failed switch
- **WHEN** native replacement is cancelled or fails
- **THEN** TODO and the persisted old session file remain intact and failure is surfaced, not treated as new-task success; cancellation keeps the active old session, while runtime creation failure may require resume/restart

#### Scenario: Unsafe or duplicate handoff
- **WHEN** messages are queued, background work or a queue task is unfinished, the project is untrusted, history is ephemeral, the session is already fresh or another handoff is pending
- **THEN** handoff refuses without session/TODO mutation; ask rather than release/claim churn
