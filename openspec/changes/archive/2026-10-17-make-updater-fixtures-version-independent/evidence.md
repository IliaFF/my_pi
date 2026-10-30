# Evidence — 2026-10-17

Authoritative root TODO task:35c4d79e4db2. Source baseline49900cdac27ed3612544a6e22166f6a851c2969e, initially clean. Current public main0d931b6 is a separately scoped publication; unrelated local commits must not be pushed.

## Observed blocker
The one approved VPS invocation55a53c936c8343efb2e9841c15bc7fbc ended with agent launcher exit0, controller rejection for incomplete OpenSpec and no package publication. Private analysis confirmed two protected tests failed with Rejected not raised. They fixed the target at browser-use0.1.28; on that updated baseline, rollback/no-op scenarios no longer exercised their intended failure. A credential-free source-copy reproduction passed both tests on0.1.26 and failed both on0.1.28. No raw model logs, auth or tool payloads were copied into this change. Historical SIGXFSZ was not reproduced and its offending file remains unknown.

## Regression before fixture fix
`python3 -B -m unittest tests.vps_updater_test.UpdaterTests.test_update_fixtures_survive_already_updated_baselines`: exit1, one test with four subcases,3 failures/1 error. Both legacy fixtures failed on0.1.28 and9.8.7; the newer synthetic baseline additionally exposed the invalid historical dependency substitution. Regression was added and run before replacing those literals.

## Passing verification
- `python3 -B -m unittest tests.vps_updater_test`: exit0,33 tests including the four updated/future-baseline subcases. Accepted pin/scope synchronization, rejected settings rollback, real temporary incomplete change, exactly one prepared repair call, no gate/Git publication and existing security/cleanup assertions remain.
- Full `npm test`: exit0, all18 checks PASS, Node v24.18.0/Python3.12.3. Includes real SDK integrations and RPC startup, not replaced with static scans or mock callbacks. Ignored test-results/results.json retains the local full report.
- Independent in-memory fixture self-check: only the three intended files differ; only the selected package/root lock pin and browser version/resolved URL change; unrelated lock entries, metadata and executable modes are preserved. Synthetic integrity remains fixture data, not proof of a downloadable package.
- Full owned diff reviewed: test helper, both callers, new regression, generated metadata and proposal/design/tasks/spec. `git diff --check` passed. No controller, real pins/lock/settings, acceptance, provider, limits or external credentials changed.

## Tested scope hashes
- tests/vps_updater_test.py: e9d27959746d21599f77885e3362efd5691775b87f747553b0a222faa4b54609
- scripts/vps-updater.py (unchanged): 9c2dbaa859b5f4a44491a421f2654135b0c01a4b3e40d27d4bce37990a81198b
Only OpenSpec evidence/checklist/archive placement and synchronized specification change after the full gate. Verify these hashes unchanged at closure; validate final contracts separately.

## Closure verification
OpenSpec archive synchronized the new requirement into build-validation without bypasses. Final `openspec validate --all --strict --no-interactive`: exit0,13 items passed/0 failed. Both recorded test/controller hashes remain identical to the passing full-gate scope. Final synchronized-spec diff and all owned files reviewed; `git diff --check` PASS.

## Limits
This is a source-only test-fixture fix. No publication/new CI run, VPS installation, second live repair, counter reset or limit increase was performed. It does not prove future migrations or the eight pending dependency updates succeed. Protected acceptance remains necessary. Publishing the scoped fix and another bounded live attempt require separate approval. Prior runtime/controller rollout and private diagnosis are documented in fresh_pi/reports/updater-signal-diagnostics/deployment.md.
