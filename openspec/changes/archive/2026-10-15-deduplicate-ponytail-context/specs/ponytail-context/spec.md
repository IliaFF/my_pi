## ADDED Requirements

### Requirement: Base rules are not advertised twice
Ponytail MUST hide its base skill from automatic selection only for runs whose lite/full/ultra rules are already injected. It MUST preserve the full rule body and all other skills without changing loader resources.

#### Scenario: Active base modes
- **WHEN** a run starts in lite, full or ultra
- **THEN** provider context contains the selected base rules but no automatic base-skill entry, and other skills remain discoverable

#### Scenario: Mode switches off
- **WHEN** an active session switches to off before a new run
- **THEN** base rules are absent and the base skill is automatically discoverable again

#### Scenario: Standalone or independent review
- **WHEN** the extension is absent or persisted review mode supplies no base rules
- **THEN** the base skill remains automatically discoverable

### Requirement: Explicit commands remain available
Request-local filtering MUST NOT remove skills from the loader or break explicit base-skill commands, mode switching, or specialized aliases.

#### Scenario: Manual base invocation while active
- **WHEN** a user invokes /skill:ponytail while full mode is active
- **THEN** the actual base-skill body and arguments reach the provider

#### Scenario: Specialized aliases
- **WHEN** a user invokes /ponytail-review or /ponytail-audit
- **THEN** the corresponding actual skill body and arguments reach the provider

### Requirement: Specialized prose follows the session language
Review and audit skills MUST request plain wording in the session language, not force English, and MUST retain their report scopes and validation requirements.

#### Scenario: Language-neutral instruction
- **WHEN** review or audit instructions are loaded
- **THEN** they request simple language selected by the session and do not prescribe English
