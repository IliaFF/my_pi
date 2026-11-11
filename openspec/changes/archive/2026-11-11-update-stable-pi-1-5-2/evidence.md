# Evidence

Initial PATH CLI and managed source: Pi 1.5.0. Node 24.18.0, npm 11.16.0. Source HEAD 6fd6f2bbdc4b80f9db09aae5282f3a3c2a37f3f7; only pre-existing untracked archive directory, left untouched. npm latest registry metadata queried successfully for all 19 direct dependencies. Candidate changes: core/TUI 1.5.2, pi-retry 0.11.4, pi-context 0.3.1, context-fold 0.8.0, fast-resume 1.4.19, markdown-preview 0.26.4, web-access 0.47.0, typebox 1.4.6. Other direct versions unchanged.

No runtime installation performed yet. Acceptance and recovery plan: design.md.

## Source verification
- Candidate dependency install with lifecycle scripts disabled (`npm install --ignore-scripts --legacy-peer-deps --prefix npm`): exit 0, 41 packages changed, 1 added, 1 removed.
- Existing version-gated patches re-checked against pristine candidate packages with `patch --forward --dry-run`: four were already-applied identical versions, three applied directly (markdown-preview, web-access with 363-line offset, context-fold), and `@spences10/pi-context` needed a regenerated patch because 0.3.0 changed the tool registration block.
- Patch files for the four changed package versions were regenerated from the actual before/after files and the old files removed; manifest versions/paths and installer dry-run text updated. No behavioral assertion, deadline or test was weakened.
- Reviewed upstream changelogs: core 1.5.1/1.5.2 (session fork for missing folder, `pi auth`, idle cache warming default, Anthropic message threads, grep/read streaming and glob fixes), pi-context 0.3.x (codemode returns objects; unchanged tool set), context-fold 0.8.0 (opt-in cache-expiry/aggressive modes only), web-access 0.47.0 and pi-retry/fast-resume/markdown-preview/typebox patches.
- Isolated pi-context runtime probe on 0.3.1 (capture/search/get/export, redaction, balanced retention, six-tool surface, 0600 files): PASS.
- Full mandatory offline gate `npm test`: PASS 28/28 (background job b8e4dbc99, exit 0), including real SDK integrations, patch apply/reverse verification, deferred-tool, quota, queue, background-jobs, Ponytail SDK and RPC startup smoke.
- `npm audit --omit=dev --legacy-peer-deps` on the candidate tree: 8 vulnerabilities (4 high, 4 moderate, 0 critical). No `audit fix` or override applied; this is a dependency-tree report, not proof of exploitation.
- Local stale refs updated in README/diagnostics for the new baseline versions.

## Project Ponytail override
- The active project loads Ponytail from `fresh_pi/.pi/npm` (was 5.3.2, stock upstream, no versioned patch applied). Range bumped to `^5.3.3`, lock integrity byte-equal to the published registry integrity, installed 5.3.3. Because this override is stock upstream and the project tree carries no Pi SDK, no separate SDK gate was run there; the patched global 5.3.3 already passes the real-SDK Ponytail gate. Project `package.json`/lock pre-state archived in the recovery directory.

## Approved installation and preservation
- Recovery pre-state at `~/.pi/pi-1.5.2-prestate.zGTqin`: exact-byte archive of the previous global core (`global-core-1.5.0.tgz`, listing and SHA-256), project `.pi/npm` pre-state archive, and copies plus SHA-256 of 8 personal config files.
- Installation: `bash ./install.sh --preserve-settings --install-core --skip-stack` (background job b686267cb, exit 0). Installer backup `/home/ilyaz/.pi/my-pi-backups/20261111T115753Z.p6NAdG`, restore dry-run PASS. Registry replay of published tarballs ran (no offline bypass).
- All ten versioned patches applied and verified on the installed tree; `maintenance verify`: failures=0, warnings=4 (settings/mcp/APPEND/AGENTS audit snapshots only).
- Installed host gate: PASS 28/28 including host-drift, patch-verify, deferred-tools, quota, queue, background-jobs, Ponytail SDK and RPC startup.
- Actual `pi --version` and managed SDK are both 1.5.2; managed pi-context 0.3.1, context-fold 0.8.0, web-access 0.47.0.
- Preservation check: APPEND_SYSTEM.md, AGENTS.md, mcp.json, my-pi-settings.json, models.json, pi-meantime.json and train-agents/config.json are byte-identical. settings.json changed only in the six aligned npm pin versions plus a concurrent provider/model write described below.
- `npm ci` in the runtime reported 8 vulnerabilities (4 moderate, 4 high); no audit fix applied.

## Concurrent settings writer (not attributed to the installer)
- After installation, `settings.json` also shows `defaultProvider: openrouter`, `defaultModel: deepseek/deepseek-v4.1-flash-1017` instead of the pre-install `openai`/`gpt-6.1-sol`. The installer preserve block writes only npm pins, `restore-configs` skips `settings.json` (restore=false), and this session runs on OpenAI. A parallel Firstmate Pi session was writing at that time and is the likely author; this is an assumption, not proven attribution.
- Consequence: another running Pi process holds its own settings snapshot and may rewrite `settings.json`. Re-check the pins before starting new work; restart Pi to load 1.5.2 in this and other sessions.

## Boundaries
- No push/publication, no SSH, no service restart, no Firstmate/MCP stack provisioning, no paid provider requests.
- Offline gates and the host gate prove loading, patching and policy contracts only; they do not prove live provider quality, latency or cache behaviour.
- `cacheWarming` left unset per user choice, so 1.5.2 uses the new `idle` default with paid cache refreshes up to 30 minutes between runs.
- Archive of the previous project override: stock Ponytail 5.3.3 replaced stock 5.3.2; no project patch was introduced.
