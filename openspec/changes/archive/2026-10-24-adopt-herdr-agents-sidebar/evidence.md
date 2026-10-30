# Evidence: approved Herdr agents/sidebar adoption

## Approval and baseline
- User explicitly approved installing into our build after tests; task `be4fcb241200`. Source clean baseline `0a7ba93`.
- Tested extension/sidebar Git revision `8864764e65a469f7d90f9a0deb39ec3f0b26befc`, npm version 3.3.1; no core/provider update or push authorized.
- Runtime has 20 direct dependencies including private extras; a full source installer is intentionally not the live deployment path. Current sessions/server must not be restarted, Focus must not be invoked.

## Source checks
- New adoption tests initially FAIL (missing pin/default config); after source changes config bootstrap/preservation passes. Existing installer preserve-config smoke passes; rollback suite 11 passed, including new config restore and previous exact path set.
- Published npm integrity: `sha512-c0s1zKTc5EpLibHkLM/ZZxiYNuPfyQgR/t1WWNmLuYG2FafDjPw8p4z8UFQv1dB+Rfsax/d/vTuiYnMZqqYFUw==`.
- Tarball pi-extension, maestro and plugins/sidebar recursively match clean tested Git source, no differences. Installed source payload matches too.
- Source npm lock adds only node_modules/pi-herdr-agents and the root declaration; zero existing lock package entries changed. Exact direct count becomes 20, settings count 17. README inventory updated after release validation identified the missing entry.
- Initial source npm install hit 100s timeout reifying the ignored node_modules symlink on Windows mount; bounded retry completed. Source release walk then hit a 90s timeout on that generated Windows tree. A private Linux npm store was successfully prepared from exact source lock (job b9d8d9687, exit 0) and the source node_modules link restored; generated slow tree retained under ignored backups, not removed to bypass checks. No failed authoritative check has been bypassed or scope narrowed.
- New/touched Python tests formatted with autopep8 and Ruff passed. RPC startup check now requires unique Herdr command owners, supports an explicit project cwd and disables MCP for host checks; no prompt/model calls.

## Verified pre-state backup
- `/home/ilyaz/.pi/my-pi-backups/herdr-agents-20261024T152016Z.YHr7Uf`, private directory, 61M archive.
- runtime.tar.gz and state.json SHA256SUMS verified; tar inventory read successfully. Archive contains pre-state runtime npm, settings, APPEND_SYSTEM, maintenance and existing Herdr plugins directory. Missing herdr config and plugins.json explicitly recorded; auth/sessions are not copied or restored by this operation.
- Snapshot records dependency declarations and file digests for pre-mutation checks. Backup created before live mutation; at backup time no installed package/settings/plugin changes had been made.

## Additional lab residue
Registry-path audit discovered plugins.json under XDG config. Helper stopped the private registry-audit server but transient EACCES on /proc/572001/environ refused immediate root removal. Later read-only ps/pgrep found no PID/server. `/tmp/piha-herdr-lab-LSG93x` retained as diagnostic residue; no ownership refusal bypass or force signal.

## Full source gate
- First authoritative check `8ca2c662-ed82-4c73-b624-25a605f41592` failed only integration/context-fold-index: wrapper incorrectly inferred agent root from external npm-store layout. Existing full SDK regression reproduced the fault. Preserving explicit PI_CODING_AGENT_DIR fixed test environment routing, with no production compaction change.
- Repeat `7d5e4f43-9939-482c-9b35-1141c8b008cb` (job bb7e3d242) passed: npm test, all 22 stages, including real context-fold SDK both load orders, extension patches and unique Herdr RPC command owners. Full owned tracked/untracked source diff reviewed; no unrelated updates found. CI itself not run.
- Before approved mutation all backup state digests still matched. Additional protected-files snapshot records 26 protected files (patched package files, MCP, Herdr integration and project settings) and all 20 original installed direct versions.

## Deployment and final validation
- Runtime install job b74f1c1d6 exited 0: exact 3.3.1 installed offline, all 20 pre-existing direct versions and 26 protected file hashes unchanged. Installed pi-extension/maestro/sidebar directories again exactly match tested clean Git source.
- Settings gained exactly one string package declaration, preserving all prior fields/package objects and order. Existing APPEND_SYSTEM bytes preserved and delegation block appended once. Missing Herdr config initialized with only approved defaults. All writes atomically renamed after pre-state checks.
- Bundled sidebar linked at stable runtime path, enabled, plugin version 0.1.0; both all/focus actions registered. action list already returns JSON by default: initial --json verification flag was rejected (exit 2), then corrected command passed; docs corrected. Neither action was invoked, server/current sessions not restarted.
- Actual fresh offline RPC startup passed twice: installed agent cwd and fresh_pi project cwd, 65 commands each, unique Herdr owners and no extension errors/prompt/model run. HERDR environment stripped for these probes to avoid publishing status into the active pane; MCP transports disabled. This proves loading, not live model/transport behavior.
- Installed-dependency full gate `78a74430-ddb4-4298-b7bf-6abf64d06470` (job b5b2a009a) passed all 22 stages, including read-only host drift verification, isolated SDK regressions and RPC smoke against installed modules.
- Post-probe runtime npm manifest equals original plus only the new exact dependency. Zero pre-existing lock entries changed, exactly one added; all 26 protected digests still match. No user auth or session files were edited.
- Implementation archived and exact owned source staged; maintenance synchronized from the index. Verification returned failures=0, warnings=3 for preserved private audit snapshots, not managed-file failures. The first final combined attempt (bc7218764) was deliberately stopped before editing: the archiver-generated Purpose still contained its TBD placeholder. Purpose was completed and the maintenance copy realigned before restarting the same final checks in the same cwd.
- Final stable source/installed gates and maintenance equality must pass before commit. Final check IDs and commit are recorded in the authoritative root TODO, avoiding evidence edits after a stable check. No push or CI/live provider run is claimed. Scope and rollback documented in docs/herdr-agents-installation.md. Synthetic integration does not prove autonomous multi-window reasoning, complete production tool interoperability or live recovery.
