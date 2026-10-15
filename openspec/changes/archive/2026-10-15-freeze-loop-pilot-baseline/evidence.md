# Evidence

## Initial scope and regression

Root task63db153ae10f. Source baseline debe24a, initial Git clean, no active OpenSpec changes. Root TODO and current AGENTS/specs read before continuing. No extra live model/provider requests authorized or made.

RED before source edits:
- `node scripts/test-loop-pilot.mjs local-extensions/loop-profiler.ts`: exit1, frozen baseline expected10 calls but rewritten receipt yielded999.
- `python3 -m unittest discover -s tests -p harness_test.py`: exit1, new owned-diff policy assertion failed; existing9 tests passed.

GREEN targeted: pure/state pilot regression,10 harness tests and actual Pi1.2 SDK loop tests pass with0 network attempts. Tests include immutable metrics after receipt rewrites/backfill/pruning, all runs of split task, unchanged0600 snapshot, native command with no provider calls, corrupt/duplicate/wrong-pilot snapshots not reset, mixed attribution still visible, existing race/masking/stop/privacy checks.

## Five completed historical tasks

Local metrics-only audit: `reports/pi-loop-grouping-20261015/historical-audit.json`; no prompt/output/credentials copied. Totals below are tagged-run observations, NOT exclusive task costs (mixed runs and unobserved fragments prevent attribution).

| Task | Tagged runs | Tagged model calls | Tool errors | Passing checks observed | Notes |
|---|---:|---:|---:|---:|---|
|5c42f2c45e19|2|29|1|0|Checks unknown, not proof none ran|
|6337469e5cc7|1|44|6|1|Mixed with setup-task attribution|
|528aea832d70|1|12|1|0|No code writes observed; unknown external work|
|c0ddf2ec4baf|1|52|4|0|Direct claim segment not reconstructed|
|4489e8643b0f|2|76|3|0|Known full gates passed, but background checks not recognized by profiler|

Two direct read-pair candidates appeared in5c42 (codemode/skills/MCP docs), and two in6337 (extension/SDK/implementation docs). These are hypotheses, not proof of independence: file/input availability, decision dependencies and output size still matter. Full large docs may exceed the300-line sidecar threshold and increase follow-up calls. Other three tasks had no candidate established by this bounded scan; nested codemode behavior is not reconstructed. Optional legacy fabric counters are absent and remain null, never zero. No hypothetical saved rounds/time or successful5+5 comparison is claimed.

Decision: keep bounded evidence-driven grouping, remove stale README direct-only instructions, clarify full OWNED diff, and start a prospective5-baseline/5-grouped pilot with current setup task excluded. Historical data is not manufactured into control/intervention samples. Future comparable tasks are needed; initiating collection does not finish that observation.

## Source SDK setup

Initial source npm/node_modules was a dangling symlink to removed `/tmp/pi-bg-pilot.aHj6s1`. The original link was preserved in `/tmp/pi-source-link-backup.UI5Pve/node_modules.link`. Two source-only installs on /mnt/d timed out180s (one registry attempt, one cache-only); these are setup timeouts, NOT SDK/provider regressions. The incomplete created tree is preserved under ignored `npm/.setup-backup/node_modules`.

Exact unchanged source npm/package-lock was then installed offline with ignored scripts in a Linux workspace, exit0, and moved to persistent `~/.cache/pi-build/source-sdk.JZRssh/workspace`; source symlink points there, lock bytes verified identical. Production npm/settings/auth were not involved. This avoids repeating a link to volatile /tmp. Fresh actual source SDK tests pass.

## Implementation and acceptance

- Snapshot is complete0600 JSON, atomically published by non-replacing hard link inside0700 pilot directory; first writer wins. Corruption is visible, not silently rewritten. Baseline uses copied run metadata, not mutable receipts.
- Existing pilot state v1 remains readable. Baseline snapshot is separate; no duplicated payload in mutable manifests. Stop updates active state consistently. Global500-run ring and per-pilot100-receipt limits retained.
- Native SDK behavior, models, credentials, packages and process-only bg policy unchanged. Restart is required to load changed profiler in an existing process.
- Source gate b535c50d0 exit0: all15 checks PASS, including10 harness tests, real SDK and actual CLI. Code/docs/spec scope stayed unchanged during the job; full owned code diff reviewed.
- Preflight: both managed runtime files and all six modified maintenance files match initial source HEAD. Full maintenance audit:158 existing tracked files match;9 missing files are the prior no-install subagent evaluation, not local edits. No source-managed conflicts. Installed revision marker is stale0fde43; approved full committed-source parity will be established before advancing it.
- Archive/final source gate and installed deployment/command activation remain pending below; no production writes yet.

## Post-archive source acceptance

Archive created with runtime tasks explicitly pending (not fabricated as complete). Canonical Purpose filled and both specs/README reviewed. Final source `npm test`: all15 PASS including full real SDK/CLI; whitespace PASS. Complete owned code diff reviewed, including frozen diagnostics, snapshot validation/atomic publication and absence of runtime/provider changes. Source archive/spec/code ready for scoped backed-up deployment.

## Installed acceptance and prospective collection

- Source implementation commit `4bcab18`, clean worktree. All installed tracked maintenance files matched source after scoped atomic copying;27 changed/new files (including revision marker) backed up under `$HOME/.pi/my-pi-backups/loop-pilot-20261015-071927-124841`. Existing unrelated files untouched. Manual scoped backup has `manifest.json`, NOT maintenance.py's `backup-manifest.json`; do not pass it to the standard restore command. Rehearsal restored old bytes/hashes only in a temporary tree, not a tested live rollback.
- Installed `npm test -- --agent ~/.pi/agent`: all15 PASS, including read-only host drift, patch verification, actual SDK lifecycle and CLI. Nine protected settings/auth/npm/project manifests unchanged. No dependency/model/settings/credentials changes and no paid/live provider probes. Missing prior optional subagent evaluator/spec source files were copied as maintenance source only; no subagent extension or package activated.
- Actual installed profiler `/loop-report pilot-start` issued using real Pi1.2 SDK slash command, in-memory credential store, explicit native current model `openai-codex/gpt-6.1-sol`, thinking `medium`, network guard enabled. Scope project hash `e15f84e206b6`; setup task63db153ae10f excluded. State0600; baseline0/5, grouped0/5, `insufficient data`; no fabricated samples,0 provider requests.
- First one-time activation verified state then exited1 only because its cleanup mistakenly called unsupported session.close(). Pilot persisted correctly; helper corrected to dispose(). Separate fresh SDK process then invoked only `/loop-report pilot`, verified same id/state unchanged and0 requests, clean exit0. No pilot reset or activation retry. This helper error is not a runtime/profiler regression.
- Initial archival happened with runtime tasks pending. After actual installed/activation checks, the change was reopened and archived with8/8 complete using `--skip-specs` (canonical deltas already applied/reviewed), correcting the workflow ordering rather than pretending pending work had passed.
- Current process is NOT hot reloaded; user must restart Pi before collecting new work with the frozen-baseline implementation. A fresh command process loading the installed file passed. Future real5+5 collection remains unverified; counts do not prove speed, correctness, answer quality or causal effects. Latest CI, live providers, MCP transports and real production rollback were not checked.
- Final source gate and final committed-source/protected-file parity recorded in local reports; code/spec/runtime payloads remain unchanged from the gates above. Closing metadata-only commit does not assert new performance results.
