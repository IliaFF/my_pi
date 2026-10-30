## Why

The user requests an explicit standing reminder that Pi provides an SSH tool, even while its definition is deferred.

## What Changes

- Add one short SSH discovery/use rule to the managed APPEND_SYSTEM source.
- Verify its presence in the existing actual SDK prompt regression without connecting to SSH.
- Do not deploy to personal runtime or change tool implementations.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `general-agent-policy`: explicitly point SSH work to Pi's discoverable remote tool.

## Impact

Only managed prompt text, its existing SDK regression and OpenSpec records. No dependencies, schemas, permissions or production files change.
