# Evidence: remove-compaction-recovery-packets

## Initial state and scope

Baseline `ac97992`; `git status --short` was empty. Root TODO task: `9fd97772bf42`. Existing `origin/main` target is the user's configured `https://github.com/IliaFF/my_pi.git`; `git fetch origin main` showed three existing local commits ahead and no divergence. Source only: runtime installation/settings/auth, old packets and other projects were not changed.

Owned scope: auto-ultra-compact, APPEND, existing compaction and policy tests, README, OpenSpec artifacts/spec deltas, anonymized historical audit. No dependency/pin change, no patch to context-fold, no new persistence layer.

## Regression

Before implementation `node scripts/test-auto-ultra-compact.mjs` exited 1: `autocompaction must not depend on a writable emergency recovery location`, actual compact calls 0 vs expected 1. Fixture HOME is a regular file, so the former recovery directory cannot be created.

After deletion: focused test exited 0. It checks threshold/retention, unwritable former recovery location, no new home/project packets, no packet continuation/status fields, unchanged legacy packet bytes, session replacement/error/manual continuation lifecycle, post-compaction usage checks. Actual Pi SDK compaction passes in both extension load orders, deterministic summary, exactly one summary owner, zero model/auth calls. Timings are not a performance benchmark.

Policy harness: `python3 -m unittest discover -s tests -p harness_test.py` exited 0, 10 tests. autopep8 and Ruff are not available on PATH or as system Python modules; their checks were not run and no substitute formatter/global installation was used. Only one existing Python policy test and its docstring changed; unrelated formatting was preserved.

## Full gate and review

First `npm test` snapshot: 20/20 stages passed, queue check `6ac82c78-de93-4262-9de6-fbc620785258`, exit 0. This preceded the additional legacy-file preservation assertions and audit document. Second full gate, including legacy-file preservation assertions and the anonymized audit: queue check `9eafdfcb-318f-4dcc-9161-40b8686c344d`, exit 0, 20/20 stages; `git diff --check` and strict change validation also exit 0. The authoritative post-archive/commit final-snapshot gate and publication result are recorded in root TODO; earlier gate evidence is not substituted for final scope validation.

Reviewed the full owned diff against clean baseline, including untracked planning/audit files, extension lifecycle/callers, existing source specs and updated tests. Packet-only helpers/config/status/marker protocol are removed; TODO authority, compactability, settings, clear-context and single summary-owner lifecycle remain. No blocker found at expected single-user local-extension load. Historical archives and release exclusion of private recovery data are intentionally retained.

Historical inspection methodology and uncertainty are in `docs/context-loss-audit-2026-10-21.md`. No raw session/packet, credentials or private project file is included. The report distinguishes a forgotten semantic distinction, a priority error with the instruction still in summary, and an unrelated data-interpretation error; none proves all failures were caused by current compaction.

## Limits

Offline checks do not prove live provider availability, interactive rendering, full preservation of conversational meaning, or numerical correctness of historical research results. No forced production compaction, personal/runtime deployment, external-service change or paid model request was performed. Old private packets remain on disk.
