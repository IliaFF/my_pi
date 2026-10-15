## ADDED Requirements

### Requirement: Meantime observation remains passive
The build MUST load Meantime from the existing pine-of-glass package alongside its selected extensions, without adding dependencies or enabling unrelated extensions. Offline checks MUST verify its command and UI timer lifecycle without a provider request. Activation MUST preserve private settings outside the approved allowlist addition and use a recoverable backup.

#### Scenario: Fresh offline startup
- **WHEN** updated portable or personal configuration starts Pi with no user prompt
- **THEN** /pace is registered, existing commands remain and no provider run starts

#### Scenario: UI reload and shutdown
- **WHEN** the actual Meantime extension receives UI startup, reload and shutdown in an isolated lifecycle probe
- **THEN** the old timer is cleared on reload and the final timer/widget cleared on shutdown

#### Scenario: Observability limits
- **WHEN** headless and fake-UI checks pass
- **THEN** results are not described as real interactive rendering validation or proof of correct provider latency attribution

#### Scenario: Explicit feature gate and preserved user config
- **WHEN** fresh configuration is installed
- **THEN** pi-meantime.json enables the observer, while preservation-mode reinstall leaves existing user tuning unchanged
