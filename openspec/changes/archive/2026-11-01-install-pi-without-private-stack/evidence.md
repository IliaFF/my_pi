# Evidence

## Regression and implementation
- Before fix, node scripts/test-portable-stack.mjs rejected --skip-stack (exit2).
- New tests exercise both actual shell guards in full/Pi-only modes, default omission, existing-server preservation, and prior instruction conflict/idempotence cases.
- An intermediate full gate found the existing Python source-extraction harness required its original argument string. Fixed mode propagation through environment instead; original harness/tests unchanged. python3 scripts/test-portable-configs.py and node scripts/test-portable-stack.mjs passed, then full source gate passed.
- User explicitly chose Pi only after the full private browser download hit600s. --skip-stack leaves defaults/full-stack behavior intact and does not require optional stack prerequisites or download Playwright. All managed Pi package updates, backups and mandatory gates remain active.

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
