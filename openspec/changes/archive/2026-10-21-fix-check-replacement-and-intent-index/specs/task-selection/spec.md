## ADDED Requirements

### Requirement: Obsolete passed checks can be explicitly superseded
The queue MUST allow the current task to explicitly supersede an obsolete stable successful check with a fresh successful latest check for the same task id/text and cwd, with a nonempty reason. Both records and reason MUST remain in the session ledger. No project files or task states may change.

#### Scenario: Archive changes the check command
- **WHEN** a successful pre-archive check becomes stale and a successful post-archive check covers the current snapshot
- **THEN** explicit supersede records the reason, preserves both checks, and completion may succeed only if all other required checks are satisfied

#### Scenario: Invalid replacement
- **WHEN** replacement is missing, stale, failed, running, invalidated, foreign, another cwd or not latest, or the reason is empty
- **THEN** the tool fails without a new supersession record, TODO change or background launch

### Requirement: Supersession retains check safety guards
Running, failed, unknown, invalidated, foreign and unstable checks MUST NOT be bypassed. Replacement chains MUST terminate at a fresh successful latest check without missing links or cycles. Unrelated required checks and the global running-check guard remain mandatory.

#### Scenario: Failed check cannot be hidden
- **WHEN** a different passing command is proposed to replace a failed or unstable check
- **THEN** replacement fails and the original command still requires a successful rerun
