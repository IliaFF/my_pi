## Why

Stock pi update moved global core to 1.3.0 and five extensions past the portable lock, replacing our Ponytail and Preview patches. Actual installed-package SDK tests reproduce eager preview_export and duplicated Ponytail discovery; review/audit language rules were also lost. Restore the existing contracts, not new features.

## What Changes

- Align the exact portable core/SDK and five changed direct extensions with the approved installed versions.
- Replay and retain Ponytail 5.3.0 and Preview 0.23.0 patches, test actual packages with SDK 1.3.0.
- After source acceptance, deploy with backup and preserve private settings; patch the identical project Ponytail override too.
- Document why stock package update alone cannot preserve custom patches.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ponytail-context`: preserve existing dedup and session-language contracts on 5.3.0, including project overrides.
- `deferred-tool-loading`: preserve Preview deferred exposure on 0.23.0.
- `build-validation`: certify the aligned 1.3.0 baseline and both active Ponytail scopes.

## Impact

Exact npm manifests/locks, versioned patches, installer/release baseline assertions, documentation and actual SDK regressions. No live model/MCP requests, credentials, sessions, package removal or unrelated policy changes. Runtime deployment is separately authorized by the user's request to fix the diagnosed installed regressions, with backup and post-install gates.
