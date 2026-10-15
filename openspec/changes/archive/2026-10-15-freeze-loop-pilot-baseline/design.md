## Context
Existing v4 profiler tracks actual SDK settlement, one task across multiple runs, model/provider/thinking/project scope, code/check events and per-run receipts. Analyze currently deduplicates mutable input and recomputes before-set. Guardrails already reject incomplete/mixed/missing data. Retrospective data has41 measurement-v1 runs but only6 code-tagged runs; no historical matched5+5 intervention can be claimed.

## Decisions
- Keep existing schema/state compatible. Add optional in-memory frozenBaseline array loaded from per-pilot baseline.json. No new dependency or generic telemetry framework.
- Write a unique0600 temporary snapshot with wx under the existing0700 pilot directory and atomically hard-link it to baseline.json without replacement. First complete publication wins. Future reads validate snapshot; corruption is reported, never silently replaced. Persist only selected baseline task runs through first completion, not prompts/tool output.
- Analyze frozen baseline from its copied runs. Later edits, continuations or earlier-arriving replacement baseline tasks must not rewrite it. Mixed/untracked and incompatible current receipts remain diagnostics; no cherry-picking good checks.
- Freeze when fifth baseline task settles or before next command/run enters grouped phase. Do not call models from lifecycle handlers. Active pilot can be stopped explicitly; no silent reset.
- Historical audit uses existing local receipts of last five completed tasks, marks mixed attribution and unobserved checks; opportunities are manual hypotheses only. Start future collection0/5 baseline then0/5 grouped if no validated frozen historical set is available. Setup task excluded. Starting collection is not claiming measured improvement.
- Clarify owned diff as own final changes against initial working state, preserve unrelated tracked/untracked work; review all own changes including untracked files. No automatic git reset/add-all.

## Risks and limits
Tasks differ in workload and check scope. Counts/timing are observational, not causality. Background/shell edits/checks can remain unobserved; fewer reported checks are not proof of fewer executed checks. Switching runtime files is not hot reload: restart or fresh sessions must load new source. Retain old files and existing observability state in backup; do not stop/reset user pilots without approval.

## Rollback
Back up exact installed profiler/APPEND/maintenance files and their hashes before copying approved committed source. Preserve settings/providers/credentials/packages and old observation logs. Confirm installed gate; on failure restore only owned destinations and validate, retaining diagnosis.
