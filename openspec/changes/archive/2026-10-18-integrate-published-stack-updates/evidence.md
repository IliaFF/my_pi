# Evidence

## Baseline and integration
- Root TODO task: 51eca2381d24. Initial source clean at 99cf313. Fetched origin/main advanced to 1446ca5; branches diverged 12 local / 5 published commits. No push or VPS changes performed.
- Normal merge preserves both histories. Conflicts: retained local queue/spec/sandbox-test additions; retained published scoped-publication evidence; combined updated README versions with default completion wake. Updated stale background manifest/table wording only. Local background patch, SDK regression, queue panel/checks and mandatory gate remain byte-identical to 99cf313.
- Eight direct version changes; dependency membership/scripts/allowScripts unchanged. Portable lock changes exactly ten package entries (eight direct plus pi-shared/rpiv-config) and root dependency metadata; no package additions/deletions. Ponytail/RPIV patches renamed without content changes. Managed-config membership retained.

## Offline validation
- Repository dependency npm ci used ignore-scripts/legacy-peer-deps. Initial Windows-mounted installation exceeded a 180s foreground limit; resumed background installation completed exit0. First source gate on Windows dependencies hit a 30s fixture timeout and overall foreground timeout; no assertion/timeout was weakened. Reinstalled the same lock on Linux (405 packages, 9s) and used the normal ignored dependency symlink.
- Merged source npm test: exit0, 18/18 PASS including strict specs, release pristine patch replay, existing unit/security tests, actual SDK regressions, queue checks and RPC startup. Repeated after archive: source gate 18/18 PASS and installed-maintenance host gate 18/18 PASS (both exit0).
- Runtime candidate retains all user manifest fields and extra pi-workspace-history ^0.5.0 locked at 0.5.0; all 19 portable exact pins match. Candidate lock differs from portable only at root metadata plus extra workspace-history/ignore entries. Project candidate changes only Ponytail declaration to exact 5.3.2 and corresponding lock; lifecycle scripts disabled.
- All seven patches applied to staged runtime; versioned Ponytail patch applied to project candidate. Staged project actual-SDK test passed after correcting a probe path that was not named node_modules (invocation issue, not package regression).

## Authorized installation
- User explicitly requested installing new published build changes. Stock installer would delete the extra user package, so staged scoped deployment was used instead; no production implementation was added.
- Private verified backup: `/home/ilyaz/.pi/agent/backups/published-build-20261018-195325`. Format verified-directory-snapshot-v1 covers complete user npm/maintenance, project npm, original settings and four queue payloads; absent checks.ts is explicitly recorded. Rollback command: `python3 /home/ilyaz/.pi/agent/backups/published-build-20261018-195325/restore.py`. This is not maintenance restore-backup format.
- First backup preparation discovered checks.ts was absent, stopped before any runtime write, then was corrected to record absent-file pre-state. Full final backup inventory was hash-verified before and after installation.
- Deployed candidate Git tree `ad5d69e3c2e0dc430d43aac1e8e66a682f9398cd`. Preserved installed maintenance tooling/logs/backups while overlaying Git source; removed only superseded versioned patch filenames. Updated the four known older queue files, including creating checks.ts. Personal settings changed only deterministic existing managed npm pins; provider/model, selectors, floating/extra sources, MCP and other configuration were preserved.
- Source-driven host gate: npm test -- --agent ~/.pi/agent, exit0, 18/18 PASS. Host integrity: failures=0, warnings=2 for existing audit-only settings/MCP drift. All 19 exact runtime versions and workspace-history 0.5.0 verified.
- Actual installed project Ponytail with actual installed SDK: PASS full/lite/ultra/off/discovery, explicit commands, independent review and language; 0 network attempts. Installed background SDK regression retains default wake and opt-outs.
- Protected user files: 15 byte hashes; project top-level configuration: 2 byte hashes; expected settings hash and complete backup inventory all PASS after host/project tests.

## Limits
- No real provider, Chrome/SSH, CIFAR invocation, live TUI, hosted CI, publication or restart/reload tested/performed. Historical remote evidence is not exact-merge CI evidence. Running sessions keep loaded code until user reload/restart.
- Existing user extra dependency is intentionally outside portable declarations. Update does not promise quality/performance gains or grant new operational permissions. Existing settings/MCP audit warnings are preserved rather than overwritten.

## Executable/configuration payload hashes
- `npm/package.json`: `f326080cefb269405e6ee005f1ded6803b597486d2d06a3a3190f7733efddc1c`
- `npm/package-lock.json`: `f11fdb93f86d6d68480566312cbb74d67133ab9c9ce0bd2054e7f07c3c5d0168`
- `manifest.json`: `5ee00c68b3319b56934955fec15d25ad743bae52eb7a533ea161a2d8becc8321`
- `configs/settings.json`: `b79fd08beb91e95362e0b7c08d80ec3fd0dd6e8b55ab0b5f73d85aba69fc6c24`
- `patches/pi-background-tasks+2.6.10.patch`: `7d4e402db1f58eabec7dd6ad83db51e262657ffff91751438d68826754101493`
- `scripts/test-background-jobs.mjs`: `0795f883cfc48eb7df924a4251110b006f70eb2068d38d2183fac2b78989153b`
- `scripts/test-build.py`: `169df8a45b26fe0384781fc10d4911f6e80fb1f181e15662a0d38aa2976ed939`
