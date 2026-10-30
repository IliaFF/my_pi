## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Supersession retains check safety guards
Running, failed, unknown, invalidated, foreign and unstable checks MUST NOT be bypassed, except explicit replacement of a provably unstarted failed preflight as specified separately. Replacement chains MUST terminate at a fresh successful latest check without missing links or cycles. Unrelated required checks and the global running-check guard remain mandatory. Cross-cwd replacement MUST remain forbidden for executed checks.

#### Scenario: Failed check cannot be hidden
- **WHEN** a different passing command is proposed to replace a launched failed or unstable check
- **THEN** replacement fails and the original command still requires a successful rerun
