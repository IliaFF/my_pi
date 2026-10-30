# Evidence: clarify-session-history-recovery

## Initial state and verified scope

Root TODO task `84ef948ee404` was Pending, with no In progress item; claimed exactly that id. Source baseline `eab4c78e90d6984f55235cb443c8408dab64c80e`; `git status --short` in pi-build was empty. Parent fresh_pi is not a Git repository. No unrelated source changes were present. No current unarchived OpenSpec change existed before this one.

Owned source: `configs/APPEND_SYSTEM.md`, its README explanation, existing `test-auto-ultra-compact.mjs` and `test-deferred-tools-sdk.mjs`, and this OpenSpec change/spec deltas. No new tool, runtime parser, dependency, persistence layer, recovery snapshot or control envelope. No threshold, retention, Canary behavior or continuation change.

## Existing recovery and the precise gap

Reviewed canonical `general-agent-policy`, `compaction-reliability`, `build-validation` and archived `2026-10-21-remove-compaction-recovery-packets` planning/evidence, plus current Canary specification/source baseline. The existing APPEND already requires current TODO after compaction, stopping on unclear task identity, and summary/project files/focused history for other details. auto-ultra-compact already names `recall_folded`; context-fold's deterministic summary already gives the native session JSONL path. These are retained, not reimplemented.

Official installed Pi documentation read: README, sessions.md, session-format.md, compaction.md, sdk.md, extensions.md and how-pi-works.md; SDK session-management and custom-compaction examples were inspected. Native sessions are append-only trees: compaction changes projected model context, not original stored entries; id/parentId selects the branch. The context-fold implementation in compact.ts, index.ts, index-store.ts and unfold-tool.ts confirms that user intents are first lines and recall searches registered foldable blocks, not all user messages. The source README previously blurred this distinction.

The installed `pi-workspace-history` README describes undo/redo/file snapshots and conversation navigation, not an agent-callable history-search replacement. It was not activated, changed, removed or relied on as the recovery mechanism. Before the source edit, targeted byte comparisons confirmed source/runtime APPEND and auto-ultra-compact were equal. No real session file was read or dumped for this task; recovery experiments used temporary synthetic sessions only. Tool discovery returned context-sidecar tools, not a general native transcript reader; context-sidecar capture is not assumed to index the entire conversation.

## Regression and implementation

An exploratory synthetic probe first used `tools: []`, which deactivated recall; that was a fixture setup error, not a source defect. With normal SDK defaults, the probe then failed on the assumption that a second-line user restriction would be found by recall. The exact restriction remained in the raw ledger. The temporary probe was removed; the small characterization was integrated into the existing mandatory SDK test instead of adding another harness.

Before changing APPEND, command:

`node --require ./scripts/no-network.cjs scripts/test-deferred-tools-sdk.mjs npm/node_modules`

exited 1 with `Recovery policy lost If an agreement or restriction is missing or contradictory`. This proves the explicit raw-history fallback was absent from the effective permanent prompt, not that the existing tools or Canary were broken.

The change extends only the existing recovery paragraph: on a missing/contradictory agreement, try focused recall; if insufficient, use the summary's exact session-ledger path and selected active-branch messages, with bounded read/bash output. Do not dump whole sessions or expose secrets. Current instructions/TODO win; absent path/evidence or unresolved ambiguity requires asking, not guessing. Manual compaction is covered by the standing instruction without changing its non-continuation behavior.

Afterward both focused commands exited 0:

- `node --require ./scripts/no-network.cjs scripts/test-deferred-tools-sdk.mjs npm/node_modules`: actual SDK effective-prompt assertions pass; existing deferred discovery/payload/resume checks retained, zero network attempts.
- `node --require ./scripts/no-network.cjs scripts/test-context-fold-index.mjs`: actual deterministic hard compaction in both extension load orders, second-line user restriction absent from live messages/summary/recall but recovered exactly from active-branch entries and a reopened temporary JSONL; summary supplies the ledger path; zero model/auth calls.

The retrieval is explicitly invoked by the test. It is not evidence that a reasoning model autonomously notices every forgotten constraint, chooses the right branch/keyword, or complies with the instruction.

## Full gate, review and publication boundary

Pre-archive source gate `c5d6995b-5da3-4704-98da-e6a048ed7c3e`, background job `b81b4e3f6`: `npm test && git diff --check`, exit 0, all 23/23 stages pass. This includes strict OpenSpec validation, real SDK fixtures, patch replay/verification and RPC startup smoke. Focused strict change validation also passed. Final committed/archive snapshot acceptance and its authoritative check id remain tracked in root TODO `84ef948ee404`; this earlier snapshot does not substitute for that final gate.

Reviewed the complete owned tracked diff and new planning/spec/evidence files against the clean baseline. No runtime API/caller/config/export changes. The existing SDK fixture now uses default tools so recall is actually active; recall is invoked directly on the synthetic fixture, with no built-in shell/filesystem tool execution or model request. Existing summary-owner, continuation, index-envelope and private-artifact isolation assertions remain. Tests are bounded, temporary, credential-free and already wired into npm test. For a local single-user agent workflow, no blocker was found. The remaining risk is semantic model compliance, not a newly introduced transcript storage system.

Source archive/commit only. No production deployment, reload, push, installation, paid/provider request, server/VPN change, personal settings/auth change, workspace-history change or full real-session dump. Live CI, UI behavior, provider availability, automatic semantic recovery and performance gains were not checked or claimed.
