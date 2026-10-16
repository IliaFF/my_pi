# Evidence: restore patches on Pi 1.3.0

## Scope and pre-state

Source base: `8a19a75`, clean Git working tree before this change. User authorized repair of the diagnosed installed regressions. No source/runtime credentials, sessions or private logs enter Git. Personal and project Ponytail were both unpatched 5.3.0; global core was 1.3.0 while personal standalone SDK peers remained 1.2.0.

The unchanged actual-package SDK regressions were rerun before implementation: Preview reported exposure `direct` instead of `deferred`; Ponytail failed `full: base skill discovery`. Installed probes passed 7/9. Review/audit files also forced English. Local diagnostic artifacts are outside this repository in `reports/pi-1.3.0-local-check/` in the parent workspace.

## Portable changes

- Core/tui and seven SDK lock entries align to 1.3.0.
- Direct extensions align to already approved installed versions: Ponytail 5.3.0, Preview 0.23.0, retry 0.11.1, fast-resume 1.4.17, web-access 0.41.0. Other direct and non-SDK transitive versions do not change.
- Ponytail patch body is byte-identical to the previous 5.2.0 patch; Preview patch only changes its source line offset. No executor, schema, hook or safety policy was rewritten. Existing actual SDK tests provide the failing/passing regressions; release baseline assertion and installer version consumer align to 1.3.0.
- Historical subagent evaluation remains explicitly 1.2.0; it is not re-certified by this change.

## Passing checks

- Fresh `npm ci --ignore-scripts --legacy-peer-deps` from the new lock in a private Linux cache: 405 packages, runtime audit 0 vulnerabilities. An ignored source npm/node_modules symlink points to that cache.
- `npm test` against new source lock: PASS 16/16; includes 21 Python tests, real SDK/faux provider, deterministic compaction, background shell lifecycle, additive deferred discovery/payload checks and actual CLI startup.
- `env -u PI_TEST_OFFLINE python3 scripts/test-release.py .`: PASS fresh registry replay and reverse dry-run for all seven patch sets, including Ponytail 5.3.0 and Preview 0.23.0.
- Independent staged copies of the two installed packages with migrated patches and actual global SDK 1.3.0: PASS 9/9. Initial staging omitted dependency lookup for copied Preview; adding the sandbox-only node_modules link fixed this setup error; production was not touched by staging.
- Final scoped runtime deployment: explicit install of core/tui 1.3.0 changed seven SDK packages only, audit 0; all 19 actual direct versions matched portable expectations before patching. Five patches remained applied, two were applied.
- `npm test -- --agent ~/.pi/agent`: PASS 16/16. Host verify: failures=0, warnings=2 for preserved private settings/mcp snapshots; no forced snapshot alignment.
- Separate project override via actual SDK: PASS mode switching, manual base/review/audit commands, standalone/independent review, session language and zero external requests. Exactly three project package files changed, identical to patched user counterparts; all other project files, project settings and npm declarations/lock stayed unchanged.
- Final pre-deployment private-file fingerprints: 11/11 byte-identical afterwards, including auth/model/settings/instructions/policy/MCP and project config/lock. Extra personal pi-workspace-history 0.5.0 remains installed with all seven package files unchanged.
- Candidate installed maintenance archive without Git, with locked OpenSpec tooling: `scripts/update-safe.sh --dry-run` PASS 16/16 against repaired runtime. This dry-run does not perform another update. Maintenance tooling retains the pre-existing OpenSpec transitive audit finding; it is separate from runtime audit.

## Recovery and failed attempts

Full personal npm tree/config backup and project patch-file backup were created outside Git and verified by SHA-256 before writes; installed maintenance source also has an archive. Backup paths and hashes are retained in local diagnostic artifacts, not source.

Fresh installation directly on /mnt/d replaced the previous dependency symlink with real files. Existing SDK tests then ran much slower and deferred regression hit its existing 60s deadline. The partial attempt was stopped, its orphaned test process terminated, and artifacts retained. Reinstalling the same lock on Linux restored the gate without changing timeouts or runtime code. The generated mounted dependency tree was removed.

Deployment attempt 1 prepared a lock before reification; npm reported up-to-date while actual SDK files remained 1.2.0. The actual host gate rejected it and automatic rollback restored the known-bad pre-repair tree/project files. Final deployment instead explicitly installs the two exact SDK packages and asserts actual package versions before patching.

Attempt 2 passed the host/project SDK gates but failed private preservation against an earlier fingerprint taken before the verified backup; it rolled back. The early settings hash differed from the verified backup (original early bytes were not retained, cause not established). The initial mismatch is not counted as a passing check. Before the final attempt, all 41 backed-up files were verified against recovery metadata and a new immediate pre-deployment fingerprint was bound to that verified state. Final preservation passes against that state; original fingerprints and failed logs are retained locally.

## Review and limits

Full tracked diff, new patches and OpenSpec artifacts reviewed against the clean initial state; no unrelated source changes. Runtime changes use a one-off external deployment recipe plus existing maintenance primitives, not a new production updater. A full installer was intentionally not used because its npm ci would remove the extra personal workspace-history package.

Offline/faux-provider checks do not prove live SSH/Chrome/MCP, endpoint availability, real cache hits, actual rendering/export, terminal UI quality or performance gains. Native install scripts remain unapproved unless already allowed; no new approval was granted. No paid model requests or GitHub CI run; no publish/push. Restart Pi to load repaired hooks. Archive and commit follow the passing gates; final packaging/installed-copy checks are recorded in the local report.
