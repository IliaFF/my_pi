## Context
Source baseline: 04f503818ce8a29ce0f79adb0cd210d276db28db, clean worktree before creating this change. Local and global OpenSpec are 1.14.1; npm latest is 1.14.3.

## Decisions
Keep the existing exact-pin convention and npm lockfile; install with --ignore-scripts. Use the existing full npm test gate and strict OpenSpec validation, which execute the local pinned CLI. Back up the global package outside Git before installing the same exact version globally. Do not run openspec update: generated skills/configuration are not part of this version-only CLI request.

## Risks and rollback
The dependency tree and audit may change; record actual results rather than infer safety from release notes. A global replacement affects other projects, so retain the previous package directory and verify the resolved CLI version. Source rollback is the reviewed dependency/docs diff; global rollback restores the saved package at the recorded original path. No runtime deployment or automatic restart.

## Publication integration
The user approved publishing to origin/main and explicitly chose merging both histories. origin/main advanced to 5c84fe2 (pine-of-glass 0.18.0 → 0.18.1); local HEAD 04f5038 contains the previously unpublished native quota fix. Merge both without force, preserve upstream changes, install source dependencies with scripts disabled and repeat the complete gate on the merged tree before publication. This does not deploy the upstream runtime update to the personal agent.
