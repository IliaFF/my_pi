# Evidence

## Regression and change
- Before fix, node scripts/test-stack-bootstrap.mjs failed:240 !==540.
- After changing only curl --max-time to540, bootstrap test passed, including existing checksum-corruption/incomplete/dirty/launcher guards. Curl HTTPS, connect timeout20s, max size128MiB and enclosing600s command limit retained.
- Full source gate db7d1b32-416c-4331-babe-9a8271ed638c passed.
- First full installer attempt failed downloading Herdr at240s and restored backup. Retained original incomplete store after reviewing clean pinned Firstmate checkout and absent complete marker/launcher. Retry passed release-artifact downloads but failed on Playwright; rollback succeeded. User then selected Pi-only scope, implemented in install-pi-without-private-stack.

Base source: origin/main cce0db1a626b26a6df658f5f9e971548bede6af5. No remote push.

## Verification
- Initial source gate failed from missing dependencies, then timed out repeatedly loading SDK from Windows-mounted /mnt/d. With explicit approval dependencies were installed offline from the same lock files on Linux disk; original dependency directories were retained outside pi-build and cwd remained unchanged. SDK import improved from timeout25s to1.45s; this is a local import measurement, not a service-performance claim.
- Full source npm test passed after the final implementation (recorded check3eb38071-7225-4e3a-83fb-469f4c8641e6).
- Final owned diff review: shared downloader and both bootstrap call sites/config callers reviewed; git diff --check passed. No dependencies added, network protections and SDK assertions retained.
- Approved deployment: bash install.sh --preserve-settings --install-core --skip-stack, job b659d0efb exit0. Actual Pi core1.4.0 unchanged. Installed pi-web-access0.46.0, pi-markdown-preview0.26.2, pi-ssh-remote0.1.15.
- Installer host gate:27 checks, all passed, including real SDK/faux provider and CLI startup. maintenance verify failures=0,warnings=4 (personal settings,mcp,APPEND,AGENTS audit-only differences).
- Backup /home/ilyaz/.pi/my-pi-backups/20261101T153855Z.y7cTKL: uninstall.sh --backup PATH --dry-run passed archive staging/validation without restoring the successful installation.
- Personal settings excluding deliberately aligned packages unchanged; MCP/context policy JSON unchanged; APPEND bytes unchanged. Existing AGENTS bytes preserved as a prefix, only missing Resource and effort limits section appended. Auth credentials were not inspected or rewritten by this work.
- Host result retained locally at /tmp/my-pi-update-20261101.7QV52I/installed-host-results.json; job logs remain in the current session .pi/tasks directory. These artifacts are not committed.

## Limits
Restart Pi to load installed code. Live providers, SSH hosts, browser/MCP endpoints and fleets were not checked; no paid calls or agent launches. Full private stack did not finish: Playwright browser download reached only40% of191MiB in600s. User explicitly changed acceptance to Pi only. Shared Playwright/browser caches and unrelated projects were not deleted. Incomplete private stores and dependency backups are retained, not active. Source CI job was not checked. Backup dry-run is not an actual rollback of the final successful install.
