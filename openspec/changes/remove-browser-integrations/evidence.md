# Evidence

## Scope and initial state

- Initial HEAD: 6d44d4442a5639f02c67d19474dcbf66fc8f07dd; fetched origin/main: 118b4e3581fe30287906dc1c926eda268ef90c95 (2/2 divergence).
- Merge: 8160f07. Local commits 591bf09 and 6d44d44 retained in ancestry; only conflict was the fs import in scripts/test-portable-stack.mjs, resolved retaining symlinkSync and both branches' regression coverage. Upstream --skip-stack and artifact timeout 540s retained.
- Private initial snapshot: /root/.pi/pi-update-initial.ws07po (status, HEAD, tracked patch and original untracked task/Canary archive). Unrelated TODO delta reconstructed from original patch and compared byte-for-byte after excluding this task: PASS.
- User explicitly chose to retain pi-markdown-preview and pi-web-access unchanged, including their optional browser launch/cookie features. Removed only separate pi-browser-use, Chrome/Jev MCP, their dedicated dependencies, managed launcher and private Jev/Playwright payloads. Historical specs/evidence and legacy backup allowlists remain; no new browser provisioning.

## Regression and source checks

- Before implementation, executable personal-config regression failed with exit 1 at `assert.ok(!("pi-browser-use" in settings))`: old preservation logic retained browser settings. Private log: initial snapshot/browser-regression.log.
- Updated portable/bootstrap/config/preservation/release fixtures cover absent browser dependencies/defaults, string/object retired package registrations, existing MCP removal, unrelated config retention, idempotence, unsafe/custom/linked cleanup refusal, quarantine integrity and copy-back restore retaining backup.
- First full npm test: 26/27 checks passed, harness failed on four updater fixtures referencing removed pi-browser-use. Fixtures now use retained pinned pi-workspace-history, retaining settings mutation coverage on pi-background-tasks.
- Repeat `npm test`: PASS 27/27, including real SDK integrations, SSH shell regression, AGENTS migration and RPC startup; private source-results.json/source-gate.log.
- `openspec validate --all --strict --no-interactive`: PASS 31/31; `bash -n install.sh uninstall.sh` and `git diff --check`: PASS.
- autopep8 applied to changed Python scope. Ruff run on four changed Python files reports 26 existing findings; code/message arrays matched original HEAD baseline exactly (2 + 2 + 9 + 13). Unrelated lint cleanup was not included.
- Owned diff reviewed, including new cleanup script, fixtures, config/locks, docs and delta/main specs. npm lock only removes pi-browser-use, pi-shared and chrome-devtools-mcp; unrelated direct pins remain unchanged.

## Approved installation and backup

- Node v24.18.0; CLI/core and SDK/pi-tui 1.4.0. Runtime direct pins matched source except the intentionally removed browser dependency; no unrelated npm extras were dropped.
- Backup root had approximately 25 GiB free. Global core exact-byte archive (156 MiB unpacked) saved privately at /root/.pi/pi-update-initial.ws07po/core/core-before.tgz, archive listing and SHA256 recorded. Global core version was already 1.4.0, so installer did not replace it.
- Command: `PI_TEST_OFFLINE=1 bash ./install.sh --preserve-settings --install-core --skip-stack`, with inherited PI_AUTO_COMPACT overrides removed from this command's environment only. PASS; installer host gate PASS 27/27. No model calls or provider auth changes.
- Installer backup: /root/.pi/my-pi-backups/20261101T172016Z.Eopfzr (0700), state.json + agent-files.tar.gz (61 MiB compressed before quarantine). `uninstall.sh --backup <path> --dry-run`: PASS with archive staging and validation; SHA256SUMS recorded privately.
- Additional browser quarantine under the same backup/browser-payloads: `stack/8869ae7da95170063bfd/mcp`, `stack/8869ae7da95170063bfd/browsers`, `bin/jev-browser`. `retire-browser-stack.mjs` PASS, 3 targets. Original payload bytes/modes/link targets fingerprinted before migration and compared after rename: PASS. Browser payloads are outside active runtime, retained only as backup.
- Existing Firstmate checkout remains 7da4c3621370534ff9689843d2b77f34158057fb at legacy store 8869ae7da95170063bfd; paper environment, backend binaries and Firstmate config fingerprint unchanged. No new stack environment provisioned. New source stack layout schemaVersion is 2; ordinary full-stack preflight intentionally refuses switching old launchers without review.
- Preservation checks: 8 protected runtime files and 24 SSH files unchanged by hash (includes credentials, APPEND, policy, Firstmate/paper launchers); settings differ only by browser registration/key removal; MCP differs only by chrome/jev-browser removal; AGENTS differs only by exact-known legacy Firstmate block migration. SSH extension, Markdown preview, web-access and paper-search remain installed.
- `maintenance.py verify` after retirement: PASS, failures=0 warnings=4. Warnings are reviewed audit drift for preserved private settings.json, mcp.json, APPEND_SYSTEM.md and AGENTS.md, not patch/dependency failures. No private config was snapshotted into Git.

## Final verification and limitations

- Final `npm test`: PASS 27/27; final `npm test -- --agent /root/.pi/agent`: PASS 27/27 after runtime quarantine. Both include real SDK/RPC checks, with results in private final-source-results.json and final-host-results.json.
- Local source npm environment pruned with --ignore-scripts: exactly the three retired packages removed; no project npm override exists. No source code changed between these successful gates and delivery; only task/evidence metadata finalized.
- Strict OpenSpec validation: PASS 31/31; final shell/diff checks: PASS. Preserved code input SHA256 verified after final gates.
- Pre-push fetch: local branch ahead by 3 commits, behind by 0; fetched remote still 118b4e3. Source/specs/tests/evidence commit 213b0b6aa72bd91617a584fecc485ce663ea8661 pushed without force; ls-remote origin main exactly matched that commit. Both 591bf09 and 6d44d44 verified as ancestors. Only this task entry from TODO was staged; unrelated TODO history, .pi/tasks and Canary artifacts remain local. A follow-up metadata-only commit records completion; final HEAD/remote equality is rechecked after it.

Offline results do not establish live SSH/MCP/provider availability or answer quality. CI for this delivery has not been checked. No paid/live model calls, browser actions or external MCP tool calls were made. System browsers, personal browser data, shared caches, Firstmate state and unrelated project work were not targeted. The current Pi process can still hold old tools/transports in memory; restart is required after finishing this session.

Rollback instructions: docs/diagnostics-and-rollback.md and docs/portable-stack.md. Installer restore does not include stack payloads: copy verified quarantine targets back only into absent destinations with reviewed safe parents, retain the backup, then rerun host gates. Backup dry-run and fixture restore passed; a full live rollback was not performed because installation succeeded.
