## Context
Base 8a19a75; local 37fa2e5; remote f4318b0. Remote uses Pi 1.4.0 and markdown-preview 0.25.0, newer than local Pi 1.3.0 and preview 0.22.3.

## Decisions
Prefer remote versions and new managed paths. Carry local Windows patch unchanged because upstream only defers tool registration. Extend upstream staged restore with local archive trailer validation, symlink resolution and post-restore fingerprint checks rather than reverting its managed allowlist. Keep its dry-run staging behavior. Automatic rollback uses the same validated restore path. Retain local docs as historical evidence, not claims about the current live runtime.

## Risks
Merge success alone does not establish semantic compatibility. Run real Pi SDK and CLI gate, installer failure fixtures, full diff and OpenSpec validation. Runtime is not deployed. Archive fingerprints compare staging and restored content, not backup authenticity. Multi-path replacement is not atomic.

## Recovery
Original refs, worktree patch, TODO and untracked archive: /root/pi_update-sync-backups/20261030T123553Z. Original commit remains on backup/pre-origin-sync branch. Never reset or overwrite unrelated working files.
