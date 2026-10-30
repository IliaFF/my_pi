## ADDED Requirements

### Requirement: Trusted exact settings pins follow release targets
The controller MUST synchronize only existing exact npm package declarations in portable configs/settings.json that match baseline dependency pins, using the trusted selected targets. It MUST prepare this configuration before repair and reject any candidate settings bytes or executable mode other than that deterministic result. Floating sources, package membership/order, resource filters, unrelated settings and all other configs MUST remain protected.

#### Scenario: Browser-use release changes its configured pin
- **WHEN** a baseline exact browser-use declaration is 0.1.26 and the selected target is 0.1.28
- **THEN** repair starts with that declaration set to 0.1.28 and no other configuration change

#### Scenario: Candidate changes configuration beyond trusted pins
- **WHEN** repair changes another setting, selectors, package list, version or executable mode, or deletes the file
- **THEN** acceptance rejects the candidate before gate or publication

#### Scenario: No managed exact pin changes
- **WHEN** no baseline exact declaration matches an updated managed dependency
- **THEN** portable settings bytes and mode remain unchanged

### Requirement: Unfinished current OpenSpec is reported as incomplete repair
A newly created unarchived change matching the current autoupdate fingerprint MUST remain rejected, with a bounded incomplete-repair diagnostic directing the operator to private logs. The controller MUST NOT auto-archive failed work, disclose model logs or relax protected-file acceptance.

#### Scenario: Repair stops for a protected-change blocker
- **WHEN** repair leaves its current change unarchived after stopping
- **THEN** the controller reports incomplete repair instead of presenting its metadata as a generic protected-file violation, and never starts acceptance gate or publication

#### Scenario: Other protected files or previous evidence change
- **WHEN** repair changes protected configuration, tests, controller or existing OpenSpec history
- **THEN** the existing protected rejection remains in force
