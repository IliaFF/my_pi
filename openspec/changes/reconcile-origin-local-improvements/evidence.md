# Reconciliation evidence

## Inputs and recovery
- Original local HEAD: 37fa2e5; fetched origin/main: f4318b0; merge base: 8a19a75.
- Divergence before merge: 7 local / 44 remote commits.
- Backup: /root/pi_update-sync-backups/20261030T123553Z; original ref retained on backup/pre-origin-sync-20261030T123553Z.
- Pre-existing TODO changes and untracked .pi/tasks and enable-canary-500k-cache-warming planning remain local, unstaged.

## Comparison and conflict resolution
- Incoming diff inventory against original local HEAD saved outside source (382 tracked paths before this change's artifacts).
- Upstream package/config/lock versions kept byte-for-byte; Pi 1.4.0, pi-markdown-preview 0.25.0, OpenSpec 1.14.3. Old preview patch names removed from the merge index.
- Code delta from upstream is limited to Windows remote patch + manifest reason + documentation, validated installer rollback, and two corresponding mandatory test stages.
- Local demo documentation and historical OpenSpec changes retained. Historical runtime evidence is not current runtime validation.
- Windows patch and its real SDK regression are byte-identical to local HEAD; rollback fixtures adapted to current installer preflight and manifest core version.

## Regression evidence
- Before integration, python3 scripts/test-install-rollback.py failed: bad gzip checksum returned PASS after restoration. This confirmed upstream did not retain the local complete-stream check.
- Added file-parent/internal-parent regression before restoring the local destination guard: file-parent fixture incorrectly returned PASS.
- After integration, python3 scripts/test-install-rollback.py PASS: safe links/hardlinks, corrupt archive, chains/cycles, unsafe destinations, real installer trap with fresh/success/failure rollback.
- python3 -m unittest discover -s tests -p installer_restore_test.py: 15 tests PASS.

## Final gate
- Queue check bf98dc97-2aff-4d23-a160-b2f3f3242483 (job beb3e7a00): npm test && git diff --check && bash -n install.sh uninstall.sh, exit 0.
- npm test: 27/27 stages PASS, including OpenSpec strict validation, release, installer rollback, actual Pi SDK Windows SSH fixture, all upstream integration gates and RPC startup.
- All 40 original untracked files were compared byte-for-byte with backup and remain unchanged. Original TODO changes remain unstaged; only the current queue task is additionally tracked locally.
- Reviewed incoming path inventory and complete reconciliation delta from origin/main; dependency manifests/locks and settings are byte-identical to upstream, original Windows patch/test preserved.
- Whole staged diff check flags six context-only blank lines in incoming stack/paper-search-installed.patch; the patch is byte-identical to origin/main and must retain unified-diff context prefixes. git diff origin/main --check and staged diff check excluding that exact unchanged upstream patch both PASS.
- Final evidence/task documentation is included in the merge commit; a fresh final snapshot check is required before completing the queue task.
- No runtime installation, SSH/live Windows check, model/provider request, CI job or remote push performed.
