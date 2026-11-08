## ADDED Requirements

### Requirement: Compaction restoration respects task ownership
Compaction instructions and automatic continuation MUST direct Firstmate supervisor sessions to their current Firstmate queue/state, not require an unrelated root TODO. Outside that contract, tracked project work MUST still reread current project TODO and stop on unclear identity. This MUST NOT introduce role heuristics, extra model calls or a second summary owner.

#### Scenario: Firstmate without root TODO
- **WHEN** automatic compaction completes in a session operating under the Firstmate supervisor contract and its work is tracked in Firstmate
- **THEN** restoration directs continuation from current Firstmate queue/state without requiring a root TODO or changing native sessions merely for a new goal

#### Scenario: Ordinary tracked project
- **WHEN** automatic compaction completes outside the Firstmate supervisor contract during tracked project work
- **THEN** restoration still requires rereading that project's TODO and clarification if it is unavailable or task identity is unclear

#### Scenario: Firstmate mentioned as task content
- **WHEN** an ordinary user message discusses Firstmate without establishing its supervisor contract
- **THEN** the message does not activate Firstmate task ownership or weaken ordinary TODO requirements

#### Scenario: Existing compaction safety
- **WHEN** manual compaction, automatic failure, session change or either extension load order is exercised
- **THEN** manual compaction remains non-continuing, failed/stale follow-ups are cleared, context-fold remains the sole summary owner and no model/auth call is added

#### Scenario: Restore controls are not user intents
- **WHEN** deterministic indexes encounter either the previous owned restore envelope or the updated owned restore envelope
- **THEN** both control messages are excluded from User intents while similar ordinary user text and substantive queue task bodies retain existing indexing behavior
