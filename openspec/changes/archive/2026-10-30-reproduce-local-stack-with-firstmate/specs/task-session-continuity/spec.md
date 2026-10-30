# Spec Delta

## MODIFIED Requirements

### Requirement: Task continuity is goal based
Outside Firstmate supervisor sessions, before starting a task from chat or TODO queue, the agent MUST assess whether it shares the previous goal. Related work MUST stay; unrelated work MUST use a fresh session; ambiguity MUST ask the user. The existing model makes the assessment; no extra model, heuristic classifier or automatic deployment is introduced.

#### Scenario: Same goal in one repo
- **WHEN** the next request fixes/tests/extends the same goal
- **THEN** it stays in the current session

#### Scenario: Different goal in the same repo
- **WHEN** the next task is independent even in the same repo
- **THEN** it starts and executes in a fresh native Pi session

#### Scenario: Unclear relation
- **WHEN** the agent cannot establish continuity
- **THEN** it asks the user and does not switch until clarified

#### Scenario: Supervisor owns task lifecycle
- **WHEN** the session operates under the Firstmate supervisor contract
- **THEN** global task-switch handoff instructions, including tool/queue instructions, do not require native replacement merely for a changed goal; Firstmate lifecycle applies without abandoning unfinished work/checks
