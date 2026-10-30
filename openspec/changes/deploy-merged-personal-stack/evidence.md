# Approved personal deployment evidence

## Authorization and source
- User explicitly requested installed Pi update and selected the full repository stack, including new portable components.
- Installed source: b7784aea1f9f4321a74e3323e2672b7b1b6a9244 (behavior from reconciled 55d6bbe plus deployment plan only).
- Source queue check af7e2cab-a8d9-4f0d-b817-ad9cc9f1002d / ba78707ab: npm test && git diff --check && bash -n install.sh uninstall.sh, exit 0; 27/27 stages PASS.
- Deployment used a clean git archive, not the dirty working tree. Maintenance copy excludes local .pi/tasks logs and unfinished enable-canary planning. All 40 original untracked files were checked against backup and remain unchanged; original TODO remains unstaged.

## Deployment and recovery
- Deployment workspace/private baseline/global CLI backup: /root/pi-deployments/20261030T125812Z (private permissions). Previous global CLI was 1.3.0; managed SDK was already 1.4.0.
- Existing installer run: bash install.sh --install-core --preserve-settings, from clean source, no source-code changes.
- Installer job b06c6dfe9: exit 0. Detailed private log remains outside Git in deployment workspace.
- Installer managed backup: /root/.pi/my-pi-backups/20261030T125933Z.YGZgUl. Gzip integrity PASS; actual uninstall --dry-run fully staged/validated the backup successfully without runtime mutation.
- Stack store: /root/.pi/agent/stack/8869ae7da95170063bfd. Store is intentionally retained by rollback; no automatic cleanup or migration is authorized.
- Available disk after install: about 27 GiB; no cache cleanup performed.

## Installed acceptance
- Actual PATH CLI: /root/.nvm/versions/node/v24.18.0/bin/pi -> core dist/bundle/cli.js; pi --version = 1.4.0.
- Exact managed npm declarations/lock and every direct installed package version match the source. Includes preview 0.25.0, web-access 0.45.0, Ponytail 5.3.3 and workspace-history 0.5.2.
- Installer full host gate: 27/27 PASS, including real SDK/Windows loopback, compaction, queue, background jobs and RPC startup. Host patches/config verification: failures=0, warnings=4 for intentionally preserved private settings.json, mcp.json, APPEND_SYSTEM.md and AGENTS.md.
- Private baseline comparison: seven protected files (including credentials/models, APPEND and context policy) retain exact bytes and modes; non-package settings/provider/model/options unchanged; package edits match only declared pin alignment, retired Herdr default removal and workspace-history addition. Existing AGENTS bytes retained as prefix with guarded portable sections appended. Every existing MCP entry retained unchanged.
- Stack completion marker/binary hashes, pinned Firstmate commit, Jev browser package 0.8.3 and installed paper-search Python distribution metadata verified. No Firstmate agent/fleet or MCP tool was launched.
- Separate pi-demo --version remains 1.4.0; its installation was not targeted.

## Limits
Current process still has old loaded code and requires restart. Offline checks do not prove live Windows SSH, providers, MCP endpoints, real browser rendering, fleet behavior, response quality, cache hits or speed. Existing blocked Windows live-identity task remains blocked and was not reopened. No paid requests, services/autostart changes, remote-host deployment or push. Final source recheck after this evidence-only commit is recorded in the authoritative queue; deployed behavior does not change with that documentation commit.
