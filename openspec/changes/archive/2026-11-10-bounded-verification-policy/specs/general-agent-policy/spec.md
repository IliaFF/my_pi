## ADDED Requirements

### Requirement: Verification is bounded by agreed checks and resources
For code changes, APPEND MUST require choosing and recording the cheapest adequate check before editing, reading actual output and exit status, diagnosing the root cause before retrying, and preserving mandatory project gates and agreed acceptance criteria. Missing or failed checks MUST be reported honestly. Checks MUST NOT be weakened, skipped or replaced without user agreement; no new control infrastructure or automatic resource allowance is introduced.

#### Scenario: Narrow check passes
- **WHEN** a focused check passes after a code change
- **THEN** the agent still runs mandatory project gates and reports the actual commands, results and remaining uncertainty

### Requirement: Repeated failed fixes trigger diagnosis
APPEND MUST instruct the agent to stop editing after two fixes fail with the same error, summarize attempts in the current task state, and test their shared assumption using the cheapest adequate probe within approved scope and budget. An unclear cause or required expansion MUST lead to a user question, not a third variant, destructive cleanup or automatic delegation.

#### Scenario: Same error twice
- **WHEN** two attempted fixes produce the same error
- **THEN** editing stops, attempts and their common assumption are recorded, and a bounded diagnostic probe precedes any new approach

#### Scenario: Probe exceeds authority
- **WHEN** diagnosing the assumption would require unapproved scope or resources
- **THEN** the agent asks the user rather than performing the probe

#### Scenario: SDK prompt assembly
- **WHEN** the real SDK loads the default global APPEND without a trusted project override
- **THEN** the assembled system prompt contains both policy paragraphs without model or network calls
