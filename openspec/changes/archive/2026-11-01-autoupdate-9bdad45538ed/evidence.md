# Candidate evidence

## Scope and release alignment

- Updated `npm/package.json`: `@amaster.ai/pi-browser-use` 0.1.33 -> 0.1.34.
- Updated `npm/package-lock.json`: browser-use release resolution/integrity and its exact `@amaster.ai/pi-shared` dependency to 0.1.34. Published browser-use integrity: `sha512-8zEzXvv8IfZrArr8zUv3cUgcSnh/P0T20NqoSZlifWt03OeXGCOSgV6OqCUAJN17Hp/lm6bKSvREvrTABOJJeQ==`.
- Registry metadata identifies upstream `TGYD-helige/pi`, directory `packages/pi-browser-use`; Node engine supports the validation Node v24.18.0.
- Verified all twenty authorized direct versions against manifest, lock root, lock package entries and installed-version gate report. Core and TUI remain 1.4.0, matching manifest and installer; no edits needed there.
- Existing package membership, scripts, allowScripts, versioned patches and managed configs retained. Hash comparison of every pre-existing non-runtime source file found changes only in the npm manifest and lock. In particular, controller-prepared `configs/settings.json`, root package files, tests, scripts, configs, CI, instructions and pre-existing OpenSpec history remained unchanged.
- This checkout has no Git metadata. No commit/revision or Git diff is claimed; source-file hash comparison and direct candidate inspection were used instead. The controller owns commits and acceptance.

## Commands and results

- `npm ci --ignore-scripts --legacy-peer-deps`: PASS (root tooling, 57 packages).
- `OPENSPEC_TELEMETRY=0 ./node_modules/.bin/openspec new change autoupdate-9bdad45538ed`: PASS, before dependency edits.
- `npm view @amaster.ai/pi-browser-use@0.1.34 version dist.integrity repository engines dependencies --json`: PASS.
- `npm install --package-lock-only --ignore-scripts --legacy-peer-deps --prefix npm`: PASS.
- `npm ci --ignore-scripts --legacy-peer-deps --prefix npm`: PASS (408 packages).
- `openspec validate autoupdate-9bdad45538ed --strict --no-interactive`: PASS.
- `npm test`: **PASS**, all 27 stages, no skips or setup errors. Includes strict all-OpenSpec validation, immutable harness/release checks, installer rollback, portable/bootstrap contracts, queue units, patch apply/verify, context-fold, actual compaction/quota/Firstmate/deferred/remote/train/queue/task-session/Ponytail/background/loop/context integrations and RPC startup smoke.
- Full machine-readable gate results and bounded logs are generated under ignored `test-results/`; they are not source deliverables.

## Audit and limitations

The install-time npm audit summary reported 11 vulnerabilities (6 moderate, 5 high). A separate subsequent `npm audit --prefix npm --json` returned a broader advisory/dependent report of 29 (24 moderate, 5 high, zero critical), including affected dependency chains. These are unresolved audit findings, not a clean security bill. No automatic audit fix, direct-pin substitution or scope expansion was attempted.

No new lifecycle scripts were enabled. No personal runtime/auth/session data was imported. No paid API key, live model, Chrome, SSH or provider transport was used. The unchanged gate uses temporary offline/faux-provider SDK fixtures; it does not prove live browser/provider behavior. No deployment, push or Git commit occurred. GitHub Actions/host acceptance and live service checks remain unverified and are controller/operator responsibilities.

## Completion

The full mandatory gate passed before archival. Archive with OpenSpec validation and `--skip-specs` to preserve protected canonical specifications, retaining the candidate-specific delta in the archived change. Required destination: `openspec/changes/archive/2026-11-01-autoupdate-9bdad45538ed/`.
