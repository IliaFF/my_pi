## ADDED Requirements

### Requirement: Isolated pinned evaluation
Evaluation MUST use pi-subagents 0.78.0 and actual Pi 1.2.0 SDK in temporary private directories, without production extension activation, credentials or external providers during offline checks. It MUST report permission, budget, lifecycle, output and declared-tool evidence separately and label untested cases.

#### Scenario: Offline safety probe
- **WHEN** the probe runs
- **THEN** third-party tools execute through actual SDK with faux responses, bounded deadlines and cleanup, and unavailable dependencies or incomplete child coverage are explicit failures or limitations rather than successes

### Requirement: Bounded live admission
Live evaluation MUST occur only after offline safety checks pass, through current Codex only, with at most four top-level launches, no nested delegation, retries or provider fallback. It MUST not claim reliable subscription dollar cost or equate launch counts with HTTP request counts. Failed safety checks MUST prevent live requests.

#### Scenario: Unsafe child behavior
- **WHEN** an offline permission or lifecycle test fails
- **THEN** the live comparison is skipped with recorded evidence and production activation remains unchanged

### Requirement: Evidence-driven adoption
Evaluation MUST preserve the notification-only process pilot and MUST NOT enable automatic per-edit review. Any runtime change MUST have a verified scoped backup and pass full offline gate; a no-install recommendation MUST be allowed when benefits are unproven.

#### Scenario: Insufficient benefit
- **WHEN** compatibility passes but a small comparison does not establish improvement
- **THEN** report uncertainty without adding the package automatically or claiming performance or quality gains
