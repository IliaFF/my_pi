## ADDED Requirements

### Requirement: Herdr tools are natively discoverable on demand
All ten pinned Herdr tools MUST register deferred without changing parameters, executors or permissions. Native tool_search MUST remain available. Fresh sessions MUST omit these schemas and the inactive routing catalog from initial declarations/prompt. Every tool MUST be discoverable/callable.

#### Scenario: Fresh session and discovery
- **WHEN** a fresh session needs Herdr capability
- **THEN** native discovery activates its original definition and operating instructions, including no-polling and the refreshed authenticated routing catalog; safe list execution, validation and permission gates remain functional

### Requirement: Deferred Herdr loading preserves recorded prefixes
Discovery MUST preserve additive prefix behavior on the supported adapter, while fallback uses native behavior. Recorded direct/partial/removed tool states MUST survive resume without implicit unload, resurrection or new loader injection.

#### Scenario: Old direct session resumes
- **WHEN** a recorded session already declared Herdr tools or removed one
- **THEN** its declared/removal states and prior serialized prefix are preserved

### Requirement: Herdr measurements isolate the affected scope
Offline measurements MUST use identical SDK/fixtures and normalized paths, include discovery overhead and distinguish exact bytes/chars from unmeasured provider tokens and external harness declarations.

#### Scenario: Affected-scope measurement
- **WHEN** baseline direct tools and candidate deferred tools are compared
- **THEN** reports identify the compared registration/snippet changes, permanent policy bytes and all excluded runtime components
