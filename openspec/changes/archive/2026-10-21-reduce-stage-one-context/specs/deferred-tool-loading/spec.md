## ADDED Requirements
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

## MODIFIED Requirements
### Requirement: Loading is additive and existing history is preserved
The five rare tools MUST NOT be automatically unloaded or redefined. For these rare tools on the supported Codex model, native loading MUST preserve the initial request tools/instructions/cache key and prior input prefix, appending additional_tools in history. Existing recorded sessions MUST retain previously declared rare tools without schema rewrites or automatic new-loader insertion. Unsupported adapters MUST use native fallback rather than pretend cache preservation.

#### Scenario: Native lazy load
- **WHEN** an initially deferred tool is loaded in a fresh session on the supported model
- **THEN** its declaration is appended while the prior serialized prefix and initial tool declarations remain unchanged

#### Scenario: Resume an already populated session
- **WHEN** a recorded session declared the rare schemas before this change
- **THEN** those tool declarations remain available and unchanged; new defaults do not rewrite the recorded prefix
