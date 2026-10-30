## ADDED Requirements

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
