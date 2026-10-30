## ADDED Requirements

### Requirement: Canary and model-safe 500k fallback
The build MUST cap extension-triggered compaction at 500000 tokens, retain native reserve protection for smaller models, and pin Canary with three failures required. Canary MUST resume the original request once after successful or failed compaction, without re-verifying or adding a summary owner. Manual user compaction MUST remain non-continuing. The mandatory gate MUST verify managed Canary configuration.

#### Scenario: Large context window
- **WHEN** compactable context grows past 170000 but remains below 500000 in a sufficiently large model
- **THEN** the local threshold does not compact and it does compact at 500000

#### Scenario: Smaller model
- **WHEN** native projected context exceeds model contextWindow minus reserveTokens below 500000
- **THEN** native compaction still runs rather than waiting for an impossible threshold

#### Scenario: Three failed recalls
- **WHEN** Canary fails three consecutive checks
- **THEN** it compacts through the deterministic owner and resumes the original request exactly once after compaction unlocks

#### Scenario: Compaction failure
- **WHEN** Canary-triggered compaction errors
- **THEN** the original request still receives a response without a hidden verification loop

#### Scenario: Test artifact isolation
- **WHEN** the SDK regression compacts its synthetic sessions
- **THEN** all session and context-fold artifacts remain in its temporary fixture, and the source release scan remains strict
