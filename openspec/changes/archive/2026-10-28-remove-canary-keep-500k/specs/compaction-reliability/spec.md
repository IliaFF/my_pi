## REMOVED Requirements

### Requirement: Canary and model-safe 500k fallback
**Reason**: Canary is no longer part of the requested build; its recall and error-continuation scenarios are obsolete.
**Migration**: Use Canary-free automatic compaction with the unchanged 500k cap and native reserve protection.

## ADDED Requirements

### Requirement: Canary-free model-safe 500k compaction
The build MUST cap extension-triggered compaction at 500000 tokens and retain native reserve protection for smaller models. Canary MUST NOT be installed, activated, patched or managed by the build, and no Canary recall probes MUST be sent. context-fold MUST remain the sole summary owner. Manual user compaction MUST remain non-continuing. The mandatory gate MUST reject Canary release artifacts and exercise native smaller-window compaction through the real SDK.

#### Scenario: Large context window
- **WHEN** compactable context grows past 170000 but remains below 500000 in a sufficiently large model
- **THEN** the local threshold does not compact and it does compact at 500000

#### Scenario: Smaller model
- **WHEN** native projected context exceeds model contextWindow minus reserveTokens below 500000
- **THEN** native compaction still runs rather than waiting for an impossible threshold

#### Scenario: Canary-free release
- **WHEN** the release is validated and installed into an isolated fixture
- **THEN** Canary is absent from dependencies, lock, settings, patches and managed configs, and a normal SDK prompt receives a direct response without a recall probe

#### Scenario: Test artifact isolation
- **WHEN** the SDK regression compacts its synthetic sessions
- **THEN** all session and context-fold artifacts remain in its temporary fixture, and the source release scan remains strict
