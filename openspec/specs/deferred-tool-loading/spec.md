# deferred-tool-loading Specification

## Purpose
Load rare tool schemas through native discovery while preserving callable capabilities, recorded session loadouts and the additive request prefix on supported adapters.

## Requirements

### Requirement: Rare tools use native discovery without losing capabilities
Fresh default sessions MUST keep remote, preview_export, context_list, context_stats and context_purge registered as deferred and callable from codemode without their complete schemas in the initial model declarations. Native tool_search MUST be active. Executors, validation, permissions, cancellation and all unrelated coding/question/background/retrieval tools MUST remain unchanged.

#### Scenario: Fresh coding session
- **WHEN** the approved baseline starts with actual installed packages
- **THEN** the five rare tools are registered/callable but absent from initial declarations and native tool_search can load them

#### Scenario: Actual safe invocation
- **WHEN** tool_search loads remote status or context stats/list
- **THEN** the existing executor runs through native tool lifecycle without SSH, live provider or destructive actions

### Requirement: Loading is additive and existing history is preserved
The five rare tools MUST NOT be automatically unloaded or redefined. For these rare tools on the supported Codex model, native loading MUST preserve the initial request tools/instructions/cache key and prior input prefix, appending additional_tools in history. Existing recorded sessions MUST retain previously declared rare tools without schema rewrites or automatic new-loader insertion. Unsupported adapters MUST use native fallback rather than pretend cache preservation.

#### Scenario: Native lazy load
- **WHEN** an initially deferred tool is loaded in a fresh session on the supported model
- **THEN** its declaration is appended while the prior serialized prefix and initial tool declarations remain unchanged

#### Scenario: Resume an already populated session
- **WHEN** a recorded session declared the rare schemas before this change
- **THEN** those tool declarations remain available and unchanged; new defaults do not rewrite the recorded prefix

### Requirement: Measurements distinguish schemas from actual cache hits
Reports MUST include tool-search overhead in before/after serialized schema bytes and MUST NOT infer token counts, real cache hits, latency or quality from offline checks.

#### Scenario: Offline acceptance
- **WHEN** the regression passes without credentials/transports
- **THEN** results describe request-prefix invariants and measured schema sizes only, leaving live endpoint/cache behavior unverified

### Requirement: Updated Preview retains deferred exposure
The approved Preview 0.23.0 baseline MUST register preview_export with native deferred exposure without changing its schema or executor.

#### Scenario: Fresh Preview after stock package update
- **WHEN** the versioned patch is applied to a pristine Preview 0.23.0 installation
- **THEN** the actual SDK deferred-tool regression passes with core 1.3.0 and safe discovery remains additive

### Requirement: Web loader is declared only while needed
The build MUST omit web_enable from current declarations when every configured pi-web-access tool is active, preserve its registered executor, and restore its declaration if a configured tool becomes inactive. It MUST preserve renamed tools, disabled capabilities, native lazy/eager adapter selection and session restoration. It MUST NOT remove unrelated tools or claim control of external harness schemas.

#### Scenario: Lazy activation
- **WHEN** a fresh lazy session calls web_enable
- **THEN** configured web tools become active and the next request omits the redundant loader

#### Scenario: Partial and resumed loadouts
- **WHEN** a configured web tool is inactive, including after resume
- **THEN** web_enable is available to restore the configured tools, while all-active resumed/eager loadouts omit it

#### Scenario: External parallel wrapper
- **WHEN** multi_tool_use.parallel is supplied outside Pi's registered tools
- **THEN** evidence reports that boundary instead of claiming schema removal by instruction
