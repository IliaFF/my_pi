# Installed-stack update evidence

## Source and authorization
- User explicitly approved updating installed Pi and the full portable stack from remote, with backup and private settings preserved.
- Initial HEAD a7937ec; fetched origin/main fb29d73. Merged without conflicts (acdfdd9); local Windows SSH patch, staged rollback implementation/tests and demo remained unchanged.
- Deployed candidate 3cdfc441880eebb88e008e222049c26b8d03e580, using a clean Git archive. Existing TODO edits, all original untracked task files and Canary planning preserved and excluded from deployed maintenance.
- Initial gate failed setup on three stale source-test dependencies; npm ci --ignore-scripts --legacy-peer-deps --prefix npm aligned them without changing runtime. Next gate had 26/27 PASS, failing only our missing YAML skip_specs marker. Corrected deployment metadata; source gate b5cbdd293/check 1adfa80c-dec3-4a47-b9cb-6d41d632c991 then passed 27/27 with diff/shell checks.

## Deployment and backups
- Private deployment workspace: /root/pi-deployments/20261031T101538Z-update. Contains baseline protected files/hashes, source revision, logs and a gzip-verified pre-install managed archive with SHA256. Nothing private imported into Git.
- Installer: bash install.sh --install-core --preserve-settings, job bc0242525 exit 0.
- Installer backup: /root/.pi/my-pi-backups/20261031T102113Z.rL90xn. gzip integrity PASS and uninstall.sh --backup PATH --dry-run staged/validated the archive successfully, without restoring runtime.
- CLI already matched 1.4.0; no global core replacement. No services, servers or current sessions restarted.

## Installed acceptance
- Installer host gate: 27/27 PASS, including real SDK regressions and RPC startup; maintenance failures=0 warnings=4 (intentionally preserved settings.json, mcp.json, APPEND_SYSTEM.md and AGENTS.md).
- All 20 exact direct npm packages and package.json/lock match deployed source. Updated browser-use 0.1.32 -> 0.1.33, markdown-preview 0.25.0 -> 0.26.2 and web-access 0.45.0 -> 0.46.0; source version-gated patches verified.
- Nine existing protected files retained modes and exact bytes, except settings has exactly the three approved managed package pin changes; two previously absent protected paths remain absent. Includes auth/models, private instructions, MCP, context and Herdr/train configuration. Initial acceptance helper expected only browser pin alignment; corrected it to the actual three approved updates, with no runtime edits.
- Actual PATH pi --version and isolated pi-demo --version both 1.4.0; demo not targeted.
- Existing portable store 8869ae7da95170063bfd retained: Firstmate 7da4c3621370534ff9689843d2b77f34158057fb clean tracked tree; Herdr 0.9.5, Treehouse 3.1.6, gh 2.103.3 and jq 1.8.1 marker binary hashes verified; Jev 0.8.3. Installer verified paper-search metadata/module hash. Stack marker and all managed launchers byte-identical to pre-state. No stack pin changed upstream, so no rebuild or extra environment was needed.
- Original untracked archive compare and unrelated TODO byte comparison PASS. No push requested or performed.

## Limits
Restart Pi to load updated code; installed does not mean reloaded in this process. Live models/providers, Windows/SSH availability, MCP endpoints, browser rendering and Firstmate fleets were not exercised. Existing blocked Windows identity task remains blocked. No paid requests, remote host update, Canary/500k/context warming or autostart changes. No current exact-merge CI job was checked; prior upstream evidence is not proof for this merge. Backup dry-run verifies staged archive safety/readability, not an actual rollback of the updated host. Final source-only documentation check is recorded in TODO queue after this evidence commit; it does not change deployed behavior.
