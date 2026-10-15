## ADDED Requirements

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
