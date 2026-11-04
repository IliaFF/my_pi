# Evidence

## Scope and initial state
- User approved migration to Pi 1.5.0, installing the updated build, browser retirement and commit/push to IliaFF/my_pi. After the guarded cleanup refusal below, user explicitly chose to leave payload files and finish delivery.
- Initial local HEAD 118b4e3 was clean; fetched origin/main 68ab8d8 and fast-forwarded five commits without conflicts or lost work. Root fresh_pi/TODO.md remains authoritative; unrelated pending tasks are untouched.
- PATH CLI and managed SDK initially 1.4.0; npm latest was 1.5.0. Updated only direct core/tui pins; retained all other direct dependency versions. Exact lock includes new pi-schema and changed upstream transitive dependencies. No new optional extension or control infrastructure.
- Candidate dependencies installed with lifecycle scripts disabled at a separate local cache directory, not into the active runtime. Existing ignored source node_modules symlinks remain symlinks; runtime dependency link now selects the candidate. Tests use ordinary background jobs with exit/log evidence, not snapshot attestation. Checks remain editable by the agent.

## Source verification
- Reviewed upstream 1.5.0 changelog, especially migration from TypeBox validation to pi-schema, and all owned source/lock/doc changes. Existing SDK tests, assertions, deadlines and patch files were unchanged.
- First npm test: 26/27 PASS; only OpenSpec failed because the no-behavior-change proposal lacked skip_specs in .openspec.yaml. Added the declared metadata flag, without weakening SDK or runtime checks.
- Repeated full npm test: PASS 27/27, including real SDK integrations, patch application/reverse verification, queue/SSH/background jobs and RPC startup. Background job b50004603 exit 0; private source-passed-results.json preserves the report.
- git diff --check and bash -n install.sh uninstall.sh: PASS.

## Approved installation and preservation
- Private recovery root: ~/.pi/pi-1.5-prestate.YQzq5B. Exact-byte previous global core archive global-core-1.4.0.tgz was listed successfully and SHA256 recorded before changes; pre-state config copies and hashes cover 832 files, including SSH and the existing Firstmate checkout.
- Installation: PI_TEST_OFFLINE=1 bash ./install.sh --preserve-settings --install-core --skip-stack. Background job b8d37284f exit 0. No full-stack provisioning or agent/model launch.
- Installer backup: ~/.pi/my-pi-backups/20261104T200103Z.GSxfPU. Backup staging/validation through uninstall.sh --backup <path> --dry-run: PASS. Global core rollback is separately covered by the pre-state archive; installer backup is not a replacement for that archive.
- Actual PATH CLI and managed SDK both report 1.5.0. Installer full installed host gate: PASS 27/27, with private installer-host-results.json.
- All 832 protected files were compared. Only settings.json, mcp.json and AGENTS.md changed. Settings match expected managed pin alignment and browser registration/key removal; MCP matches only chrome/jev-browser removal; AGENTS changes are confined to the existing Firstmate section. APPEND, auth, model overrides, context policy, SSH files and checked Firstmate/paper launchers remain byte-identical.
- maintenance verify: failures=0, warnings=4, for preserved private settings/MCP/APPEND/AGENTS drift. No private snapshots imported into source.
- npm installation reported 8 vulnerabilities (4 moderate, 4 high). No automatic audit fix or dependency override was applied; offline regression PASS is not a security audit.

## Browser cleanup limitation explicitly accepted
- pi-browser-use is absent from managed dependency/configuration; chrome and jev-browser MCP registrations removed.
- The documented retire-browser-stack.mjs refused the existing legacy store because stack/8869ae7da95170063bfd/complete.json is missing (ENOENT). Refusal occurred before quarantine creation or moves: no browser-payloads/state.json exists and original mcp/browsers directories remain. No marker was invented and no validation bypassed.
- User explicitly chose to leave these files and complete delivery. Legacy browser payloads/launcher are therefore retained on disk, not claimed physically removed. System browsers, private profiles and shared caches were not targeted.

## Boundaries
- Project .pi/npm still pins Ponytail 5.3.2; it was not updated or certified as part of the managed 5.3.3 runtime. Independent projects, separate Firstmate/MCP stack, SSH config, services and remote hosts were not modified.
- No paid calls, provider quality tests, live MCP/SSH/browser actions or CI job verification. Offline tests establish only their exercised scope. No full live rollback was performed after successful installation.
- Restart Pi after delivery: the running process can retain old SDK/extensions/MCP transports in memory. Installing files does not hot-reload this session.
- Publication and final gate details are recorded below after completion.

## Publication
- Checked source/install evidence committed as 33371d6be3ef269c92d59d63302b6d27411bdd54 and pushed without force to origin/main. ls-remote exactly matched this SHA. Fetch immediately before publication showed no incoming divergence.
- Final preservation and registration assertions: PASS; backup restore dry-run: PASS; strict validation: 31/31 before archive. Final archive validation/gate and metadata commit follow without runtime/code changes.
- Final archived-source npm test: PASS 27/27, background job bf9839533 exit 0; report saved privately as final-archived-source-results.json. Final bash syntax and git diff checks PASS. Only this publication record changes after that gate; executable code, locks and tests remain identical.
