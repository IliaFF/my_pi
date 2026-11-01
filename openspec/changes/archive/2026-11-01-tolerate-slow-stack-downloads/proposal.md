## Why
The approved local installation failed downloading the pinned 30 MB Herdr artifact: about 80 KB/s exhausted curl's 240-second deadline. Source tests passed and installer rollback restored managed files. At this rate the artifact needs over six minutes.

## What Changes
- Increase only the direct release-artifact curl deadline to 540 seconds, below the existing 600-second command deadline.
- Add offline bootstrap regression coverage for the bounded download arguments.
- Retain all checksums, size limits, incomplete-store refusal and rollback behavior.

## Capabilities
### Modified Capabilities
- `portable-user-stack`: allow bounded downloads slower than four minutes.

## Impact
scripts/install-stack.mjs and scripts/test-stack-bootstrap.mjs. No version, credentials, SSH, service or agent-launch changes. The user approved the change and a longer installation retry. No automatic cleanup of incomplete stores.
