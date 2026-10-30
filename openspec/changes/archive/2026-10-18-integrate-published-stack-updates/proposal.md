## Why
User explicitly requests checking our published build repository and installing new changes. origin/main 1446ca5 contains dependency updates while local main 99cf313 has twelve unpublished commits, including default background wake and queue checks.

## What Changes
Merge the published source without losing local behavior, validate exact dependency/patch updates, and install the merged build in preservation mode with verified backup. Align the active project Ponytail override to the approved exact version so it does not shadow the updated user package.

## Capabilities
### Modified Capabilities
- build-governance: approved deployment preserves local work, private configuration and active override compatibility.

## Impact
Merge conflict resolution, existing exact pins/locks/patches and docs from upstream; local/user runtime deployment only after gate. No push, VPS mutation, paid provider call or automatic restart. Version-only upstream changes use existing SDK regressions rather than a fabricated failing bug test.
