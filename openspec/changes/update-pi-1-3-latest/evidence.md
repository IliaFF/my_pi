# Validation evidence

## Initial state

- Revision: 8a19a759282808788a98db8669413d48c6ec7689
- Node: v24.18.0; active Pi: 1.2.0.
- Initial tracked changes: TODO.md only; pre-existing untracked change planning artifacts preserved. Full initial diff saved locally in /tmp/pi-update-1-3/initial.diff.

## Registry stable versions

| Package | Before | Selected latest |
|---|---|---|
| `@amaster.ai/pi-browser-use` | 0.1.26 | 0.1.27 |
| `@beyona/pi-zai-usage` | 1.1.0 | 1.1.0 |
| `@dietrichgebert/ponytail` | 5.2.0 | 5.2.0 |
| `@earendil-works/pi-coding-agent` | 1.2.0 | 1.3.0 |
| `@earendil-works/pi-tui` | 1.2.0 | 1.3.0 |
| `@ff-labs/pi-fff` | 0.11.0 | 0.11.0 |
| `@juicesharp/rpiv-ask-user-question` | 2.13.8 | 2.13.8 |
| `@monotykamary/pi-retry` | 0.11.0 | 0.11.1 |
| `@spences10/pi-context` | 0.1.16 | 0.1.16 |
| `context-fold` | 0.7.0 | 0.7.0 |
| `pi-background-tasks` | 2.6.10 | 2.6.10 |
| `pi-fast-resume` | 1.4.16 | 1.4.17 |
| `pi-markdown-preview` | 0.22.2 | 0.22.3 |
| `pi-ssh-remote` | 0.1.15 | 0.1.15 |
| `pi-token-speed` | 0.11.0 | 0.11.0 |
| `pi-train-agents` | 0.2.7 | 0.2.7 |
| `pi-web-access` | 0.40.0 | 0.41.0 |
| `pine-of-glass` | 0.15.3 | 0.15.3 |
| `typebox` | 1.3.37 | 1.3.37 |

19 direct dependencies retained; no new package added. Registry lookup completed successfully. Patched package version changed only for pi-markdown-preview (0.22.2 -> 0.22.3).

## Limitations

CI, paid/live provider requests, interactive rendering, Chrome/SSH transports and provider answer quality are not checked. Fresh-empty-agent installer behavior is not certified; the actual isolated upgrade and production upgrade passed. Rollback payload integrity verified; an actual production rollback was not needed or exercised. Restart is required to activate the new code in the current session.

## Exact candidate preparation

- npm ci --ignore-scripts --legacy-peer-deps --prefix npm: PASS; all 19 actual direct versions match package.json and lock. Core/pi-tui 1.3.0 aligned.
- pi-markdown-preview 0.22.2 and 0.22.3 pristine index.ts: byte-identical; patch only renamed/version-gated to 0.22.3. Other six patched package versions unchanged. No bug fix or new behavior introduced; existing actual-package regressions reused.
- npm package-lock generation: audit reported 0 vulnerabilities for selected tree (not a live-service check).
- Historical bounded-subagents evaluation remains explicitly Pi 1.2.0; its pinned historical evaluator/spec are not part of the active gate and are not relabelled as a 1.3.0 result.

## Candidate offline gate

`npm test`: PASS, 16/16 checks, Node v24.18.0, core 1.3.0; actual SDK/faux provider, deferred tools, queue, Ponytail, background jobs, context runtime and CLI RPC startup included. Detailed local artifacts: /tmp/pi-update-1-3/candidate-gate/. No transport/provider requests.

## Pristine replay and setup diagnostics

- First direct release invocation inherited PI_AUTO_COMPACT_* from current session and failed the fixed-default 170k assertion. Repeated with env -i and explicit PATH/HOME/agent: full release replay PASS, including all seven pristine patch application/reverse checks and real deterministic compaction. No code fix was needed.
- First isolated installer attempt stopped at preflight because its explicitly selected empty agent had no context-fold dependency yet. No production changes occurred. Retry provisions isolated existing-runtime dependencies before installer preflight; this verifies upgrade preservation, not a fresh-empty-agent installation claim.
- Backup root: /root/.pi/my-pi-backups/pre-1.3.0.DohhJX; global-core.tar.gz, source-before.tar.gz, old maintenance helper/manifest, private configuration hashes. Runtime maintenance backup moved to this root/runtime before installer can replace maintenance. Every file hash and npm archive SHA-256 verified; both gzip archives readable. Baseline verify: failures=0 warnings=2. Rollback source: 8a19a759282808788a98db8669413d48c6ec7689 (Pi 1.2.0).

## Isolated upgrade acceptance

- Existing-runtime isolated preserve-settings upgrade: PASS; full 16/16 host checks and private settings/APPEND/context policy/Meantime assertions PASS. Candidate core 1.3.0 provided via isolated PATH, global production core remained 1.2.0. Local logs: /tmp/pi-update-1-3/isolated-install-ready.log and isolated-gate/.
- All seven pristine registry patches replayed/reversed successfully; renamed preview patch hash unchanged.
- Pi 1.3.0 Kimi custom-baseUrl migration checked without printing secrets: not applicable to current models.json; provider configuration unchanged.

## Production acceptance

- `install.sh --preserve-settings --install-core`: PASS. Active global Pi `pi --version`: 1.3.0. All 19 installed direct versions match selected registry stable versions/exact lock. Internal SDK packages in the lock are 1.3.0.
- Installer recovery backup: `/root/.pi/my-pi-backups/20261016T000908Z.z2abnh`. Independent pre-update global core/runtime/source backup: `/root/.pi/my-pi-backups/pre-1.3.0.DohhJX`.
- Full `npm test -- --agent ~/.pi/agent` (installer invokes identical test-build.py entrypoint): PASS, 16/16, including host drift, SDK integrations and RPC startup. Results retained locally in `/tmp/pi-update-1-3/production-gate/`.
- Separate maintenance verify: failures=0 warnings=2. Warnings are audit-only private settings.json and mcp.json drift already present before update; these are preserved, not overwritten.
- Hash/semantic preservation: APPEND_SYSTEM.md, mcp.json, my-pi-settings.json, pi-meantime.json, train config, quota/resume configs, auth.json and models.json unchanged. settings.json differs only by approved managed npm version pins. All 16 configured personal packages belong to the managed set.
- Runtime lock npm audit --omit=dev --legacy-peer-deps --prefix npm: 0 vulnerabilities; this is not a live endpoint or supply-chain guarantee. Separate global npm tree audit not run.

## Final review

- Final explicit `npm test -- --agent ~/.pi/agent`: PASS, 16/16 checks, core 1.3.0, after final source documentation edits. Local artifacts: `/tmp/pi-update-1-3/final-gate/`.
- Full tracked diff and owned untracked artifacts reviewed against initial state; preview patch is an identical-content rename, exact dependency set remains 19. `git diff --check`, changed shell/Python syntax, JSON parse and strict OpenSpec validation: PASS (12 items).
- Existing TODO.md changes preserved and excluded from source commit. Session-created background logs moved outside source to `/tmp/pi-update-1-3/background-task-artifacts`; no logs, dependencies, sessions, credentials or backups included in commit. No push or CI job performed.
- Change remains active and unarchived; user may request archival after review. Current running Pi process must restart.
