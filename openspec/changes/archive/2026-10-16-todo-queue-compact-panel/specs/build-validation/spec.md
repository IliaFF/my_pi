## ADDED Requirements

### Requirement: Queue panel has native offline lifecycle coverage
The mandatory gate MUST exercise the queue widget through actual Pi SDK registration with faux/no provider, temporary TODO files and real TUI width handling, while preserving existing queue SDK coverage. Checks MUST cover collapsed/expanded output, external atomic edits, non-TUI isolation, reload/shutdown cleanup and read-only/no-model behavior.

#### Scenario: Mandatory offline gate
- **WHEN** npm test runs
- **THEN** native queue tool tests and panel rendering/lifecycle checks execute without credentials, external model calls or production TODO changes

#### Scenario: Installed archive startup
- **WHEN** the gate stages the managed files and starts the installed RPC CLI without a prompt
- **THEN** the queue module and all its imported helpers are present and load without a provider call
