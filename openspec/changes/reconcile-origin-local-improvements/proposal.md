## Why
Local main has seven unpublished commits and origin/main has 44 newer commits. A fast-forward would lose local Windows SSH and rollback safeguards; blindly preferring local files would downgrade the portable stack.

## What Changes
- Merge origin/main, keeping its newer core/package pins, portable policies and scripts.
- Preserve unique Windows cmd SSH support, installer rollback integrity checks, real SDK regressions and isolated demo documentation.
- Resolve the markdown-preview rename to upstream 0.25.0 only; retain pre-existing local task/planning files without publishing them.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `build-validation`: merged stack retains both real SDK and rollback gates.
- `build-governance`: rollback combines current managed destinations with staged integrity validation.

## Impact
Source, patch metadata, installer/uninstaller and mandatory tests. No production installation, provider calls, credentials changes or cache cleanup. Backup and local backup branch retain the original state.
