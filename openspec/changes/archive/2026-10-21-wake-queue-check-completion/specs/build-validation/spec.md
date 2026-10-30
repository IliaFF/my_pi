## MODIFIED Requirements

### Requirement: Queue check freshness has offline native coverage
The mandatory gate MUST cover changed/added/deleted and untracked files, stable service TODO changes, failed/unknown/running results and actual nested SDK background execution in temporary projects. No credentials, paid requests or production files may be used. Recorded-check completion MUST be tested with real native follow-up and a scripted faux provider, including success, failure and timeout without duplicate wake.

#### Scenario: Full gate
- **WHEN** npm test executes
- **THEN** snapshot regressions and actual queue/background package integration run with finite deadlines, stale checks cannot mutate TODO, and native completion continuation is verified offline
