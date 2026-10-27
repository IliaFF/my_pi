# Verification evidence

## Initial state and authorization

- Source baseline `ce53714`; pre-existing TODO edits, generated .pi/tasks and this change's planning artifacts preserved. Owned diff reviewed against the saved pre-implementation diff; private artifacts stay under `/tmp/pi-remote-install/`, outside Git.
- User approved isolated SSH verification, then installation with backup. Full preserve-settings installer first stopped at preflight because inherited PI_AUTO_COMPACT_* changed its fixed-default test threshold. Runtime hashes were unchanged. Repeated in a child process without those variables: installer and installed-runtime gate PASS, but comparison with the backup revealed 12 unrelated dependency downgrades. Private settings changed only in one managed npm pin; personal instructions, policy, MCP, models and auth hashes remained unchanged.
- User explicitly chose to fix rollback, restore pre-install versions, and deploy only SSH delta. Original rollback rejected the internal npm link before writing. Production restoration is not claimed by this source gate; separate results follow below.

## Regression and source verification

- New actual-CLI sandbox regression on saved pre-fix uninstall.sh: exit 1, `FAIL unsafe backup symlink: npm/node_modules/.bin/jiti`. Managed/unmanaged contents unchanged. Original failing run was captured before editing source in `/tmp/pi-remote-install/rollback-regression-before.log`; a saved-baseline replay also confirmed unchanged sentinels.
- Fixed actual uninstall CLI: PASS for internal symlink/hardlink, file bytes and executable mode; rejects traversal, absolute/outside/unmanaged links, chained/cyclic links and writes through chains, unmanaged members, FIFO, missing/truncated payload, bad gzip checksum, missing expected paths, wrong agent/state scope and unsafe existing destination parent before agent mutation.
- Actual installer invocation in sandbox with PATH shell fixtures (no registry/provider requests): PASS for automatic successful restore, fresh-empty backup and explicit failed restore, preserving original npm failure code 73 and private sentinel. Core rollback handling retained; no actual global-core rollback was exercised.
- `npm test`: **PASS 18/18**, exit 0, job `b7ad488b8`. New install-rollback stage 1.820s; actual-package remote-shell SDK 16.875s; RPC startup 5.888s. Other real SDK and release/patch gates retained. Node v24.18.0, Python 3.12.3, source Pi SDK 1.3.0 / remote 0.1.15.
- `bash -n install.sh uninstall.sh`, Python syntax checks, strict change validation, full owned diff review and `git diff --check`: PASS. Source/task evidence metadata after this gate does not change executable code.
- No new dependency, backup format, credentials, private logs or dependency tree committed. No CI job, push or archive claimed.

## Deployment preparation and limits

- Pre-install backup's remote index matches the recorded initial hash. In a private replay directory, reversing the previous source remote patch and applying the new source patch yields a file byte-identical to the tested package. This verifies a specific deployment baseline; it is not a live/installed test.
- Safe extraction cannot authenticate legacy backup provenance: installer state has no signed payload/per-file hashes. Staging validates archive structure, gzip trailer and destination confinement before removal; restored bytes/link targets/executable bits are compared against staging.
- Staging requires free space. Replacement across multiple managed paths is not transactional; post-copy errors explicitly leave restore unconfirmed and retain the backup. Full installed-source drift may differ because the personal dependency stack is newer than this repository lock; never call pin alignment preservation or hide that mismatch.
