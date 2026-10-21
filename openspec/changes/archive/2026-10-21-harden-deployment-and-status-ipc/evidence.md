# Evidence — 2026-10-21

## Baseline and scope
Initial source HEAD: e85c8aa033e65f511bb98876a53f889994b4a904; no pre-existing tracked/untracked source changes. Owned scope: herdr optional send boundary, uninstall staged restore, Hono lock, gate registration, native SDK and isolated archive tests, this change/specs. Root TODO task8ee088a9213b remains authoritative for publication/installation/final checks. Installation of this new version was separately approved using ask_user_question; VPS is excluded.

## Red → green
- Initial current-backup dry-run and restore fail with `FAIL backup contains unexpected managed paths`; historical backup fails on ordinary `npm/node_modules/.bin/tool -> ../pkg/cli.js`.
- Native SDK + injected TUI context with no-network preload fails with a session_start extension error `NETWORK_BLOCKED` before correction. The same real SDK fixture passes afterward, including fire-and-forget status paths, one exact retry on unavailable synthetic transport and no retry on successful delivery. No real pane/socket/provider request is used.
- Review caught a missing `agentPresent` field being treated as an empty backup. New red regression reproduced successful deletion of synthetic current files; requiring the field fixes it. Nine archive tests now pass: current/historical format, dry-run, bytes/permissions/private-file preservation, normal symlinks/hardlinks, unsafe members/links/devices, missing/corrupt payload, wrong manifest/agent, outside destination ancestor and missing present manifest.
- Read-only dry-run of the real previous installer backup passes; actual user restoration is not performed.

## Checks
- `python3 -m unittest discover -s tests -p installer_restore_test.py`: PASS9.
- `node --require ./scripts/no-network.cjs scripts/test-herdr-ipc-sdk.mjs`: PASS.
- autopep8 (owned Python changes) and Ruff: PASS, including the extracted uninstall Python block; bash syntax and git diff whitespace check: PASS. Existing import ordering and explicit subprocess check=False in the gate were aligned for lint without behavior changes.
- `npm update hono --package-lock-only --ignore-scripts --legacy-peer-deps --prefix npm`: only Hono version/resolved/integrity changed,4.13.9→4.13.13. Direct dependencies and ranges unchanged. `npm audit --omit=dev --prefix npm`:0 known vulnerabilities. Advisory GHSA-5r4p-p66f-jhc7 concerns serveStatic prefix-middleware bypass; actual exposure of a live app is not established.
- First recorded `npm test`0b79b825 failed only because the newly prepared dependency cache lacked its expected `npm/` parent. Corrected the cache layout, not production code; the failure remains recorded and is rerun with the same command.
- Full `npm test`967bcc48-391e-4e4c-a6bf-ab8b523e2b35: exit0,22/22 (real SDK/faux provider, fresh locked replay, patch apply/verify, RPC startup). Strict active OpenSpec validation: PASS. Full owned tracked diff and new specs/tests reviewed; no release blocker remains at expected single-user local scale.
- Post-archive/commit source and installed gates are required next; their final outcomes and backup location belong in root TODO, not fabricated here before execution.

## Historical task reconciliation
5d0b65b is an ancestor of published origin/main=e85c8aa. Source and installed docs/context-loss-audit-2026-10-21.md have identical SHA256:175fcedb9bdccbc8a1d990346dfe39d948d62d267b3d4ef67a0513475aa298b7. Supported task_queue edit updates old task9fd97772bf42 with the factual completed outcome. It remains technically Blocked: checks/supersede/complete require the current matching id; there is no reopen API. No ledger/check outcome alteration or manual bypass.

## Limits
The stack establishes a failed optional IPC report, not the exact reason the original process received its network preload. Historical crash records are preserved; no /bug upload is sent. Best-effort IPC failure can leave Herdr status stale but must not abort Pi. Restoration stages/validates before mutation, but final filesystem replacement is not a transaction: an I/O failure after replacement starts can require retrying the backup. Python tarfile data-filter support is required (tested Python3.12). No new dependency or runtime option was added. Offline SDK tests are not a real TUI reload, live service/provider/security assessment or CI job for the new revision.
