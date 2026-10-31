## Why
The user requests restoring automatic compaction at 170000 tokens instead of the current 500000-token extension cap.

## What Changes
- Restore the default extension cap and threshold to 170000 tokens.
- Keep native reserve protection, context-fold ownership and continuation behavior unchanged.
- Update regression boundaries, release documentation and the compaction specification.
- Remove pending and blocked TODO entries as explicitly requested; retain completed history.

## Capabilities
### Modified Capabilities
- `compaction-reliability`: restore the default 170k automatic threshold.

## Impact
Local auto-ultra-compact, tests, README and manifest. No production installation or personal settings changes. Push the tested source to origin/main; origin/main is already an ancestor of local main.
