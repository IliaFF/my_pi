## ADDED Requirements

### Requirement: Approved October exact refresh preserves local contracts
The portable candidate MUST match all 19 approved exact dependency targets, retain the existing dependency names and allowScripts, and pass the unchanged full offline npm test gate. Versioned patches MUST preserve existing behavior on the target releases. Prepared settings and all protected source paths MUST remain unchanged.

#### Scenario: Candidate acceptance
- **WHEN** the approved exact runtime lock is installed with lifecycle scripts disabled
- **THEN** patch verification, existing real SDK integrations and startup smoke pass without credentials or paid API calls

#### Scenario: Incompatible upstream change
- **WHEN** preserving a required behavior needs changes to protected tests, scripts or configuration
- **THEN** the repair stops with evidence instead of weakening the gate
