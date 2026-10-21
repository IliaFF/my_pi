## ADDED Requirements
### Requirement: Service skills require explicit invocation
Only Ponytail help, gain and debt MUST be excluded from automatic skill advertisements using native command-only metadata. Their actual bodies and arguments MUST remain available through /ponytail-name aliases and /skill:ponytail-name with the extension active or off; native /skill: commands MUST also work without the extension. All other skills MUST retain their prior discovery behavior.

#### Scenario: Automatic discovery
- **WHEN** a provider request is prepared in any Ponytail mode or standalone
- **THEN** help/gain/debt are absent from the skill advertisement but remain in loader resources

#### Scenario: Explicit command
- **WHEN** either explicit command form is invoked for help/gain/debt
- **THEN** the real skill body and supplied arguments reach the provider

## MODIFIED Requirements
### Requirement: Base rules are not advertised twice
Ponytail MUST hide its base skill from automatic selection only for runs whose lite/full/ultra rules are already injected. It MUST preserve the full rule body and all other model-invocable skills without mutating loader resources.

#### Scenario: Active base modes
- **WHEN** a run starts in lite, full or ultra
- **THEN** provider context contains the selected base rules but no automatic base-skill entry, and other model-invocable skills remain discoverable

#### Scenario: Mode switches off
- **WHEN** an active session switches to off before a new run
- **THEN** base rules are absent and the base skill is automatically discoverable again

#### Scenario: Standalone or independent review
- **WHEN** the extension is absent or persisted review mode supplies no base rules
- **THEN** the base skill remains automatically discoverable

### Requirement: Updated Ponytail overrides retain the portable patch
The approved 5.3.2 baseline MUST retain request-local base-skill filtering and session-language review/audit instructions in both personal and active project package installations. Explicit commands, loader resources and all package files outside the approved patch scope MUST remain unchanged.

#### Scenario: Project override after stock package update
- **WHEN** an unpatched project Ponytail 5.3.2 overrides the personal package
- **THEN** the same backed-up versioned patch is restored there and the actual SDK mode/command/language regression passes with core 1.3.0
