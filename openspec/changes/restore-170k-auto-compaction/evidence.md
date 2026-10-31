# Validation

- Baseline: main b120c0c; origin/main fb29d73. Local main already contains origin/main and 14 additional commits. User explicitly approved pushing the entire current main, not only the threshold fix.
- Before edits: TODO.md modified; .pi/tasks/ and openspec/changes/enable-canary-500k-cache-warming/ untracked. These unrelated artifacts are not included in the source commit. Pending Canary and two blocked tasks were removed through task_queue as explicitly requested; completed history preserved.
- Regression before fix: with PI_AUTO_COMPACT_EFFECTIVE_TOKENS and PI_AUTO_COMPACT_PERCENT unset, node scripts/test-auto-ultra-compact.mjs . failed at `must compact at 170k` (0 !== 1). Other inherited user overrides were not modified.
- After fix: same regression PASS, including real SDK deterministic compaction in both extension load orders, no model/auth calls.
- Background job bf9088ebb: npm test PASS, 27/27 checks, exit 0; real SDK compaction and native smaller-window protection included. Core version: 1.4.0; Node v24.18.0.
- npx openspec validate restore-170k-auto-compaction --strict --no-interactive PASS.
- git diff --check PASS. Full owned tracked diff and all new change artifacts reviewed.
- No production installation, personal settings changes, external model calls or live service validation. CI job not run. Environment overrides may supersede release defaults in existing runtimes.

## Delivery
Source commit e794ccd7d19e709c27017990efe75e295691ed13 pushed to origin/main. git ls-remote origin refs/heads/main matched this exact commit after push. Earlier local history was included as explicitly approved. Only this evidence and the delivery checkbox changed after the passing full gate.
