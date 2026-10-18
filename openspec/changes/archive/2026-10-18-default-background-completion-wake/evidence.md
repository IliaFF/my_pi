# Evidence

- Baseline: clean pi-build Git worktree; parent fresh_pi is not a Git repository. Root TODO task ed5e9977ee5d.
- RED before package edits: node scripts/test-background-jobs.mjs npm/node_modules exited 1 at line 75, false !== true for omitted wake flag.
- GREEN: actual Pi SDK + native background package: 12 faux provider requests / 11 agent runs; 0 network attempts. Covers default success/failure/timeout, /bg, opt-outs, busy queue, cancellation, reload, shutdown/history and duplicates; existing process/output limits retained.
- Final npm test: exit 0; 18 checks passed. Includes release/patch replay, OpenSpec, SDK integrations and RPC startup. Node v24.18.0, Python 3.12.3.
- Earlier full attempts: one rejected a renamed scenario (fixed by preserving its original name), and post-archive validation flagged an overlong requirement (shortened with an explicit opt-out scenario); one failed release setup with Errno 12 Cannot allocate memory. Unchanged final code passed on retry; resource limits were not altered.
- Review: full owned patch/test/README and OpenSpec documents reviewed; no unrelated initial changes. Queue-check explicit false and EventBus required booleans retained. Existing UI rerun action remains explicitly notification-only (not a bg_run or /bg default).
- Production activation, real provider/UI, SSH/CIFAR job and CI service were not tested or modified. Automatic wake consumes model quota and grants no new operational permission.

## Tested source hashes
- `patches/pi-background-tasks+2.6.10.patch`: `7d4e402db1f58eabec7dd6ad83db51e262657ffff91751438d68826754101493`
- `scripts/test-background-jobs.mjs`: `0795f883cfc48eb7df924a4251110b006f70eb2068d38d2183fac2b78989153b`
- `README.md`: `eee24c35b133b9a904a17422a4d2bcf51622e71c68151552ca7de949a749e077`

## Authorized local installation (2026-10-18)
- User explicitly approved installation after source commit 9f582fc. Scoped backup: `/home/ilyaz/.pi/agent/backups/default-background-wake-20261018-185828` (private, hash-verified scoped-files-v1; rollback: `python3 /home/ilyaz/.pi/agent/backups/default-background-wake-20261018-185828/restore.py`, not maintenance restore-backup).
- Updated only two compiled background files and the twelve changed maintenance payloads. Applied the source commit delta to maintenance instead of replacing unrelated older maintenance files; build-validation retains its existing unrelated requirements. No project background override exists.
- Before installation: runtime matched the old background patch. Installed maintenance verify passed (0 failures, 2 audit-only personal settings/MCP warnings). Current Git source verify additionally reported four pre-existing newer queue-config differences; those were preserved, not deployed.
- After installation: actual installed maintenance host gate exited 0, 16/16 checks PASS, including host-drift, patch verification, actual background SDK and RPC startup. Its baseline lacks the two newer queue-check gates present in source; source gate was separately 18/18 PASS before installation.
- Actual installed background regression: 12 faux requests / 11 agent runs, 0 network attempts. All 18 protected settings/auth/locks/extensions hashes and all 14 installed target hashes unchanged after tests.
- No provider/GUI/SSH/CIFAR invocation, external CI, restart or reload performed. New defaults take effect after user reload/restart; current session retains loaded old tool definitions.
