## Existing mechanisms
APPEND already says to read current TODO after compaction and use summary/project files/focused history. auto-ultra-compact names recall_folded. context-fold's deterministic summary includes the native session-file path. recall searches registered foldable blocks, while user messages are not foldable; user intents contain first lines only. Pi's append-only JSONL preserves full entries linked by id/parentId.

## Decision
Keep one owning recovery paragraph in APPEND; do not edit context-fold, its reminder envelope or Canary. Name the trigger (missing/contradictory agreement), existing recall path, then native raw-ledger fallback using the summary's exact path and active branch. Require bounded selected messages, protect secrets, and ask rather than infer missing authorization. This covers manual compaction as well as every automatic trigger without a second summary owner.

## Scope and risks
Callers: permanent APPEND assembled by the actual SDK; existing deferred-tool SDK test; existing auto-compaction SDK fixture and mandatory gate. No tool schema, config, fixture dependency or export changes. Raw history is sensitive and may include abandoned branches/obsolete permissions; current instructions and TODO win. The instruction is a model contract, not an autonomous semantic-recovery guarantee.

## Validation
First fail an effective-prompt SDK assertion for the missing raw-history fallback. Then extend the existing compaction fixture with a second-line user constraint: missing from summary/recall, present via exact active-branch raw entry before and after reopening the temporary ledger. Use no personal sessions or external requests. Run focused tests, mandatory npm test, strict OpenSpec, review owned diff, evidence, archive, commit, and final committed-scope gate. Do not deploy.
