## ADDED Requirements

### Requirement: Native quota fallback has offline SDK coverage
The mandatory gate MUST exercise the actual patched usage extension with actual Pi SDK lifecycle and footer rendering, isolated synthetic credentials and mocked HTTP. It MUST cover native/legacy disjoint IDs, missing/changed auth, rejected origins/redirects, account-source labels and late-result cleanup. No real model/provider calls are permitted.

#### Scenario: Mandatory quota regression
- **WHEN** npm test runs
- **THEN** fallback routing/rendering and credential rejection failures reject the build without private credentials or live requests
