## ADDED Requirements

### Requirement: Queue check freshness has offline native coverage
The mandatory gate MUST cover changed/added/deleted and untracked files, stable service TODO changes, failed/unknown/running results and actual nested SDK background execution in temporary projects. No credentials, paid requests, production files or automatic model wake may be used.

#### Scenario: Full gate
- **WHEN** npm test executes
- **THEN** snapshot regressions and actual queue/background package integration run with finite deadlines and stale checks cannot mutate TODO
