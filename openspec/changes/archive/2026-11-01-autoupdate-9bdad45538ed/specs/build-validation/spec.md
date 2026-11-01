## ADDED Requirements

### Requirement: Authorized November candidate preserves exact release scope
The autoupdate-9bdad45538ed candidate MUST match all twenty authorized direct dependency targets, including browser-use 0.1.34 and core/TUI 1.4.0, while retaining existing package membership, scripts, allowScripts and local behavioral contracts. The controller-prepared settings snapshot MUST remain unchanged. Acceptance MUST use the unchanged full npm test gate without credentials or paid provider calls.

#### Scenario: Exact candidate is validated
- **WHEN** the candidate dependencies are installed with scripts disabled and legacy peer resolution
- **THEN** exact manifest/lock/installed versions agree, existing patch and SDK/startup regressions pass, and no protected source is changed

#### Scenario: Protected repair would be necessary
- **WHEN** a failing mandatory contract cannot be repaired within the permitted source scope
- **THEN** work stops with documented evidence and the change remains unarchived rather than weakening tests or changing protected files
