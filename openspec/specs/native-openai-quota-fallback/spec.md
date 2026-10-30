# native-openai-quota-fallback Specification

## Purpose
Provide an explicitly labeled separate Codex-account quota meter while native OpenAI inference remains selected, without forwarding native credentials or claiming native app allowance or account equality.

## Requirements

### Requirement: Explicit separate-account meter
The extension MUST show available Codex account quota for native openai without changing inference. It MUST use a separately configured official openai-codex OAuth credential, never a relabeled native credential, and label account quota separately from native app allowance. It MUST NOT claim account equality.

#### Scenario: Different native and legacy model IDs
- **WHEN** native openai is active and a valid separate Codex OAuth source is configured
- **THEN** the footer shows labeled Codex account windows without changing the selected model or native auth

#### Scenario: Missing or unsafe source
- **WHEN** the Codex source is missing, non-OAuth, proxy-origin, redirected or fails
- **THEN** native credentials are not forwarded and the footer reports unavailable without cached numbers

### Requirement: Current lifecycle and auth only
The extension MUST revalidate native-view Codex auth on status refresh, discard late account/model/lifecycle results and preserve other providers.

#### Scenario: Logout or account change
- **WHEN** the Codex credential changes or disappears before a refresh completes
- **THEN** the previous account reading cannot be displayed as current

#### Scenario: Late response after shutdown or newer model event
- **WHEN** an earlier refresh resolves after a newer lifecycle state
- **THEN** it cannot restore numeric data or reinstall the old footer
