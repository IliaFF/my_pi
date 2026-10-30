# Spec Delta

## REMOVED Requirements

### Requirement: Optional status IPC failures are nonfatal
**Reason**: The default Pi Herdr plugin is no longer part of the approved runtime.
**Migration**: Retain history in archived evidence; preserve Firstmate backend support without claiming old plugin-specific SDK coverage for an absent package.

## ADDED Requirements

### Requirement: Fresh install preflight does not require its future runtime
Installer source preflight MUST retain structural, privacy, pin and registry patch validation without requiring an already installed Pi/context-fold SDK. Runtime-independent harness checks MUST still run. The mandatory npm test gate MUST force full installed-runtime SDK validation, regardless of the internal installer preflight mode.

#### Scenario: Empty profile and no usable Pi
- **WHEN** a fresh candidate is validated before dependencies/core are installed
- **THEN** source validation can succeed without importing a nonexistent runtime; the installer still requires its documented install-core permission to install a missing core

#### Scenario: Mandatory source gate
- **WHEN** npm test runs
- **THEN** it explicitly disables the source-only preflight mode and retains the actual SDK check

### Requirement: Release scanning prunes excluded runtime directories
The release privacy scan MUST skip descent into .git, node_modules and test-results, not traverse them before filtering. All other release files MUST retain the existing forbidden-path and secret-content validation, including similarly named non-excluded directories.

#### Scenario: Dependencies exist in the source tree
- **WHEN** source validation runs with installed test dependencies
- **THEN** excluded directory descendants are not visited, ordinary files remain checked, and no dependency relocation is needed

### Requirement: Portable stack has isolated acceptance checks
Mandatory checks MUST cover fresh/preserved instructions, the approved package/skill/MCP/provider inventory, pinned Firstmate bootstrap and refusal of unsafe replacement. Actual SDK assembly MUST verify the Firstmate fallback with project APPEND precedence. Live transports, fleet execution and provider quality MUST remain separately unverified.

#### Scenario: Full source gate
- **WHEN** npm test runs
- **THEN** stack contracts and isolated installer/SDK cases execute alongside all retained integration/startup checks without production files, credentials or external model calls
