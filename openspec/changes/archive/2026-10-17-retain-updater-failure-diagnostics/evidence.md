# Evidence — 2026-10-17

Authoritative task: fresh_pi/TODO.md `d37a2302bf0f`. Initial source HEAD `d2d02b5`; working tree was clean before this task. Pre-existing commits, personal runtime, auth/settings, VPS controller/state/timer and remote Git were not changed.

## Reproduction before implementation
- Existing live evidence established worker signal 25/SIGXFSZ and an empty final-only agent log, not the offending file. No historical model output was recovered or copied here.
- New regressions against the original controller: `python3 -B -m unittest tests.vps_updater_test` exit1, 31 tests, 9 failures/3 errors. Native JSON launch, signal classification, retained status and cleanup were missing.
- Pair rotation regression before its fix: selected orchestration test exit1, 1 failure (orphaned status sidecar).
- Global failed-worker cleanup regression before its fix: selected cleanup test exit1, 1 failure (reset-failed absent).

## Passing checks
- `python3 -B -m unittest tests.vps_updater_test`: exit0, 32 tests. Includes a real subprocess with default SIGXFSZ disposition and a 1024-byte fixture file limit: it flushes an event, exceeds that limit and dies. Real log/status persist with 0600 modes. Production file/output limits remain 64 MiB; the fixture scales only the child's test limit down.
- Structured cases cover worker exit/signal, OOM, timeout, launcher signal, missing/malformed/timed-out status query, controller deadline, success, status-before-stop/reset ordering, no raw fixture text in exception/metadata, paired rotation and interrupted-controller cleanup. External systemd boundaries are stubbed only in these portable unit tests.
- Full `npm test`: exit0, all 18 checks PASS, Node v24.18.0/Python3.12.3. Contract/CI config, harness, release, queue/loop unit checks, patch apply/verify, stack surface, actual deferred/train/queue/queue-checks/ponytail/background/loop/context SDK integrations and RPC startup retained. `test-results/results.json` is local ignored evidence, not committed.
- Independent actual local user-systemd check: `systemd-run --user --wait --pipe` without --collect leaves failed worker metadata queryable (observed Result=core-dump, ExecMainCode=3, ExecMainStatus=25, launcher exit1). Default Python ignores SIGXFSZ, so the fixture explicitly restores SIG_DFL; Result may be signal or core-dump. Initial manual fixture/oracle mistakes were corrected, not interpreted as production failures.
- Invoked the actual Updater.sandbox with only its external launch/manager boundary redirected to local user systemd: emitted event survived; error identified worker SIGXFSZ; metadata and log were 0600; stop/reset left no matching loaded unit. No Pi model/provider, SSH, VPS, Telegram or remote Git calls in this check. This is not a full VPS isolation test.
- Full owned diff reviewed: controller, all callers, tests, docs, generated change metadata and proposal/design/spec/tasks; no acceptance, dependency, auth, retry or resource-limit relaxation. `git diff --check` PASS. Archive/main-spec strict validation is recorded by the closure command.

## Tested runtime hashes
- scripts/vps-updater.py: `9c2dbaa859b5f4a44491a421f2654135b0c01a4b3e40d27d4bce37990a81198b`
- tests/vps_updater_test.py: `5e12bcaf750bb22e398edd5edf86d9a4e191b4547ff15e80632f7db997d2809b`
- docs/vps-updater.md: `d002d0ee77eff195c2fabb6f2778ff778dab59b0cefab025ce68089ddcdf38a8`

Only OpenSpec wording/checklist/evidence/archive placement changes after the full gate; runtime/tests/docs must retain these hashes at closure.

## Archive closure checks
- OpenSpec archive completed with the new requirement synchronized into vps-stack-updates; no validation bypass.
- Final `openspec validate --all --strict --no-interactive`: exit0, 13 items passed, 0 failed.
- All three recorded runtime/tests/docs SHA-256 hashes match the full-gate scope after archive; final main-spec diff reviewed and `git diff --check` passed.

## Limits and next deployment boundary
This fixes loss of failure diagnostics, not the historical resource violation. The exact file/operation that caused the live SIGXFSZ remains unknown. Native event logs are sensitive, can themselves reach the unchanged cap, and are not guaranteed to identify the exact file. No live-provider success, CI/publication, VPS installation, paid retry, performance gain or future migration success is claimed. Publishing/installing this controller and one bounded live diagnostic retry require separate approval, scoped reviewed publication, root-private backup and the documented rollback procedure. Do not reset attempts or deploy unrelated unpublished commits automatically.
