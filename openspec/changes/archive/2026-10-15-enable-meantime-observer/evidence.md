# Evidence — enable Meantime observer

## Approval and scope
User approved Meantime activation, then selected Meantime + review-only for other candidates. No other packages installed, no version changes, no paid provider calls/Fusion/warming/Advisor consultations. Source parent `dbfdffa`, Node `v24.18.0`, pine-of-glass `0.15.3`, Pi core/pi-tui `1.2.0`.

## Findings and smallest complete activation
- Allowlist addition alone is insufficient: `extensions/pi-meantime/config.ts` defaults enabled=false. Add `extensions/pi-meantime/**` to portable/personal pine allowlist and `configs/pi-meantime.json` / runtime `pi-meantime.json` with only enabled=true. Existing widgets/options unchanged.
- Audit-only managed config records expected default without maintenance apply silently rewriting later tuning. Installer fresh/default mode uses enabled default; preservation mode retains an existing config byte-for-byte. Its regression covers fresh config, explicit disabled/tuned user config preservation, and default reset.
- Shared upstream config lookup uses HOME/.pi/agent, not PI_CODING_AGENT_DIR. Initial full sandbox gate reproduced missing /pace even with sandbox agent config. Test HOME now models the standard layout via a symlink wholly inside its temporary sandbox. Custom installed directory alone does not redirect upstream config; README/design disclose this rather than claiming custom-path support.
- Native RPC old config regression: exit 1, missing command pace. After activation: exit 0, 51 commands, existing queue/Ponytail retained, no model run or extension errors.
- Release allowlist contract initially rejected the fourth extension; exact required selection updated to four, plus explicit enabled feature-gate assertion. No arbitrary extensions enabled.

## Preservation and backup
- Full maintenance-format backup `backups/20261015-040857-522047` is ignored, not committed. Verified all payload hashes and npm-tree SHA256 before editing runtime.
- Private pre-state records absent pi-meantime.json. Settings structurally compared with only one allowlist entry appended; private APPEND/mcp/context-policy/auth/models bytes and runtime npm lock hash unchanged. Source npm manifest/lock untouched. New source/runtime feature-gate bytes identical.
- Pre-removal backup restores old settings; restoring exact pre-state also requires removing the newly created pi-meantime.json. Production rollback not exercised.

## Checks
- Actual package lifecycle probe: /pace registered; no UI timer in headless mode; fake UI gets widget; timer callback works; reload clears old timer; shutdown clears final timer/widget; stale callback after shutdown safe. Isolated HOME/cwd and original timer functions restored. No provider calls. This is fake UI + actual package hooks, not a real terminal rendering test.
- `npm test`: exit 0, all 12 source checks passed, including existing real SDK integration and network-guarded CLI. Unit/harness 19 tests passed.
- `npm test -- --agent ~/.pi/agent`: exit 0. Host audit failures=0/warnings=3 for existing private settings/mcp/APPEND differences; no reset/snapshot to hide them.
- `python3 scripts/test-release.py`: exit 0; exact lock remains 18 direct/422 entries, pristine patch replay and release hygiene passed.
- Full implementation/config/test/README diff reviewed; new feature config and OpenSpec files reviewed. `git diff --check`: exit 0. Ten implementation/config/test/doc paths mirrored to installed maintenance; installed `npm test -- --agent ~/.pi/agent`: exit 0.

## Separate mechanism review
Report in fresh_pi `reports/context-mechanisms-for-stack-20261015.md` reviews the saved 2026-10-15 source snapshots for Tersio, Smart Compact, Cache Optimizer, Context Include, DS4, Background Tasks and Advisor Flow, without peer-version filtering. It identifies process-only jobs, bounded test-result receipts, read-only context manifests, manual handoff, cache-churn diagnostics and a separately budgeted manual Advisor experiment. Each is compared against existing context-fold/pi-context/loop-profiler/TODO owners, with limits, tests and concrete source locations. The report is outside this standalone build Git repository. No proposed mechanism implemented or automatically queued.

## Limits
Reload/restart required for current process to load Meantime. Real interactive TUI appearance, live latency attribution, actual token/cost savings, other candidates' runtime behavior and production rollback unverified. No push/current-revision CI. OpenSpec archived successfully; post-archive source and final installed maintenance gates both exited 0. All 17 staged source/spec/archive paths matched the maintenance mirror byte-for-byte. Local commit follows completed checks.
