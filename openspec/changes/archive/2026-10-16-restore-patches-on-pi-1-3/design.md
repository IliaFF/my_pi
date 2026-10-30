## Context

Source baseline 8a19a75 passes 16/16 with SDK 1.2.0. Installed core 1.3.0 and updated packages fail the lock gate. Isolated installed SDK 1.3.0 probes pass 7/9 and demonstrate loss of two patch sets. User and project Ponytail 5.3.0 source files are identical and both unpatched.

## Decisions

Keep the upgraded versions rather than downgrade working user packages: Ponytail 5.3.0, Preview 0.23.0, retry 0.11.1, fast-resume 1.4.17, web-access 0.41.0. Align the pinned core/tui to 1.3.0 so the mandatory test and personal standalone SDK match the global CLI. Port only existing patches. Reuse existing actual SDK tests and maintenance backup/apply/restore primitives; do not add another production updater or wrapper. Inspection found an extra personal pi-workspace-history 0.5.0 absent from the portable lock. A full installer npm ci would remove it, so merge the exact portable dependencies into the existing personal manifest and update that existing npm tree without replacing private settings or unrelated packages. A temporary lock rehearsal proves only seven SDK packages change versions.

The project Ponytail is a separate override, so back up its affected files and apply the same portable patch there. Compare unrelated package files and private settings before/after. Do not rewrite project settings or upgrade project dependencies.

## Risks and Rollback

CLI 1.3.0 uses dist/bundle/cli.js: use package metadata, not old path assumptions. Verify every updated version by fresh lock install plus patch reverse checks and full SDK gate. Native dependency scripts remain denied unless already approved. Maintenance backup covers personal npm/config; a separate archive covers installed maintenance source; a separate verified file backup covers the project patch. On failure, restore the scope changed and report rollback checks rather than claim acceptance. Runtime cache/UI in the current process still requires restart.

## Validation

Before code changes: retain existing two failing SDK regressions. After: mandatory npm test, release patch replay, actual installed host gate, identical user/project Ponytail file comparison and isolated project actual SDK test. Preserve private settings/APPEND/auth hashes. No paid/live tests. CI is unverified unless a real job is run. On WSL keep test dependencies on the Linux filesystem via an ignored npm/node_modules symlink: a direct fresh install on /mnt/d made the existing 60s SDK deadline expire; do not weaken that deadline. The aborted mounted-tree attempt is setup/performance evidence, not a passing gate or proof of a code regression.
