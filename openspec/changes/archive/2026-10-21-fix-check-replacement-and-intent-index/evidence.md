# Evidence: fix-check-replacement-and-intent-index

## Baseline and scope

Clean tracked/untracked Git state at `5d0b65b906c69517ab79334226f6203df07bfdee`; authoritative root TODO task `baf79501dbd6`. Owned changes: queue check validation/tool schema/docs, context-fold patch/manifest, existing unit and SDK regressions, one new index regression integrated into the existing build gate, and OpenSpec artifacts/specs. Dependency versions and npm lockfiles are unchanged. Personal runtime, old session logs/packets and blocked task status are not rewritten.

## Red regressions

`node --test scripts/test-queue-checks.mjs` before implementation: exit 1, 5/6 passed. The new obsolete-check case failed with `Check before-archive is failed, stale or unknown; explicitly rerun: validate-active-change` despite an explicit fresh replacement record.

`node scripts/test-context-fold-index.mjs` before patch: exit 1. User intents contained the synthetic restore prompt and `[TODO QUEUE task123]` instead of the queued task body. A native SDK assertion run against the unmodified installed package also rejected the polluted summary; it was not silently counted as a patched-source pass. Focused tests were rerun with PI_CODING_AGENT_DIR selecting the source dependency tree, not by altering runtime.

## Green focused checks

- Unit queue checks: 6/6. Coverage includes missing/cyclic/non-latest chains, empty/oversized reasons, failed/running/unknown/unstable/invalidated records, foreign task/text/cwd, stale replacement, unrelated requirements and direct-evidence behavior.
- Actual native queue/background SDK: exit 0, synthetic faux provider, external network disabled. Active-spec file is checked, archived, then replaced by a current passing check through the actual tool schema. Failure cannot be superseded; same-command rerun succeeds; missing/foreign/stale/same-id/other-cwd/blank-reason replacements fail. Invalid attempts do not append supersession; valid supersession launches no job and leaves TODO bytes unchanged. Original records and reason remain in the append-only ledger. Completion succeeds only after all requirements are satisfied. Existing error/timeout/reclaim/wake checks still pass.
- Soft extractIndex and hard extractCompactionIndex: exit 0. Synthetic user and queue-body intents retained; exact owned restore envelope excluded; ordinary similar text retained; source text unchanged. Later-line GPU/publication restrictions intentionally remain absent from the first-line index (characterization, not a preservation claim).
- Actual native Pi compaction in both extension load orders: deterministic summary includes queue body, excludes owned restore/queue heading; one summary owner and zero model/auth calls. Both cases run with network disabled after patch apply. The pre-apply release test does not demand patched index behavior; the mandatory post-apply integration explicitly does.
- Published context-fold@0.7.0 source fetched using existing maintenance.pristine_files: bytes equal local pre-patch baseline. Forward replay matches patched bytes exactly; reverse dry-run passes. No package version change or new dependency.
- Strict OpenSpec change validation and `git diff --check`: exit 0.

## Review and limits

Reviewed the full owned diff and connected task check lifecycle, existing source specs, patch application/manifest, source-vs-runtime module selection, gate ordering, new untracked patch/test/planning artifacts. No blocker found for the intended local extension workflow. Pre-archive full gate: queue check `970aa064-b883-48d4-8bfd-3bbdddcf2441` / job `b0be79b78`, exit 0, all 21/21 stages passed, including new context-fold-index and actual queue/background SDK. Terminal snapshot inspected before further edits. Final committed gate result and publication identity are recorded in root TODO; focused/earlier results do not substitute for the final snapshot. Remote fetch confirmed no divergence (0 ahead/0 behind before this commit).

Supersession is explicit and reasoned; it does not prove that a replacement command has equivalent semantic test coverage. Only a previously stable successful record is eligible: if files changed before terminal inspection, the unstable result still needs a rerun. Re-running a linked replacement changes its ID; explicitly relink obsolete records to the current latest ID. No bypass for the previously blocked historical task is performed.

WireBlock lacks origin metadata. Exact owned text envelopes are a documented shortcut, not general natural-language filtering: a user literally reproducing the complete envelope can be misclassified in the derived index. Replace with origin metadata if the bridge supports it. No history/source text is deleted. Multiline restriction preservation is not fixed by this change.

Python change is one gate registration; existing surrounding style preserved. autopep8/Ruff were unavailable in the preceding source workflow; no global install or formatter substitution was performed. CI/live providers, interactive UI behavior and full historical semantic preservation are not certified. Source publication does not deploy changes to the installed runtime.
