# Standing prompt reduction (source only, 2026-10-24)

## Boundary and baseline

Root TODO task `2c1be340ebea`; clean source `d5557a7bb990a6efea422ec99a52efdad4bdf288`. No production installation, private runtime/config edits, Focus, child launch, paid request or publication. `npm/node_modules` points to the dedicated build cache, not the personal agent installation.

The user's earlier approximate inventory (runtime 25.5k chars, 34/146 tools, ~16.1k tokens total) is not the same snapshot as this new session. Read-only inspection of this session's initial recorded system message found:

- 31 declared Pi tools, 38,909 UTF-8 bytes of tool-definition JSON.
- Section contents: 31,071 chars / 32,739 UTF-8 bytes, including project context, skills, Ponytail and transport metadata. This excludes XML wrappers and schema JSON; it is not the runtime-only count.
- `tools`: 5,215 chars / 5,227 bytes; `rules`: 10,218 / 10,284; `addendum`: 3,816 / 3,816; skills: 4,002 / 4,391; project context: 1,996 / 3,195.
- Codemode's callable inventory later contained 135 names. That is not a total registered-tool count: model-only tools and external harness declarations have another boundary. An exploratory discovery loaded three unrelated schemas in this measurement session; it did not execute them or change installed defaults.
- Initial declared names and all section sizes are in the change's `measurements.json`. No raw prompt, private messages, credentials or histories were exported. `multi_tool_use.parallel` is outside Pi's registry and not controlled by this patch.

## Minimal change

All ten Herdr tools now use native `exposure: deferred`, retaining original schemas, executors, permission/validation/cancellation behavior and command registration. `tool_search` remains direct. No new loader, dependency or generic prompt rewriter. The existing deferred-loadout restorer now also owns the ten Herdr names, retaining recorded active/removed states. Existing sessions are not proactively unloaded.

Full `subagent`/`subagent_resume` descriptions remain in their discovered schemas, but their tool-list snippets no longer repeat those descriptions. Detailed lifecycle/configuration help remains in the existing `pi-herdr-agents` skill. Permanent APPEND keeps the advance >1 managed-window decision, small-work exclusion, intent clarification, clear-goal research allowance, executor continuity, bounded results and parent verification/integration. Authorization, process-only prohibition, native task handoff, queue checks and no-polling remain explicit.

SDK snapshots tool guidelines before Herdr mutates its routing array at session start. A small re-registration of the same deferred subagent definition after that mutation refreshes the SDK snapshot; it does not launch or activate a new deferred tool. This retains a usable authenticated catalog after discovery instead of a startup placeholder.

## Reproducible affected-scope comparison

From `pi-build/`:

```sh
node --require ./scripts/no-network.cjs scripts/test-deferred-tools-sdk.mjs npm/node_modules
npm test
```

Actual SDK 1.4.0 / Herdr 3.3.1, empty credentials, temporary HOME/agent/cwd, faux provider, no skills/MCP transports. Baseline simulation changes only Herdr registration exposure back to direct and its two snippets back to the unchanged full descriptions. Both variants use the same candidate APPEND and catalog refresh, isolating schema/snippet exposure. Old five-tool deferred behavior and search overhead are included on both sides. The separate older all-direct comparison remains a regression fixture; its 19,817-byte saving is **not** the saving of this change.

| Affected component | Before | After | Saving |
|---|---:|---:|---:|
| Initial provider tool-definition JSON, bytes | 23,537 | 9,238 | 14,299 |
| Initial `tools` section content, bytes | 4,281 | 714 | 3,567 |
| Initial `rules` section content, bytes (empty-auth fixture) | 3,522 | 564 | 2,958 |
| Source APPEND file, bytes | 3,793 | 4,266 | −473 |

Net measured saving for these non-overlapping components: **20,351 UTF-8 bytes** (14,299 schemas + 6,052 standing section bytes after policy growth). `tools` + `rules` save 6,509 chars before the 473-char policy expansion. This is not a full personal request serialization or a provider token count. The fixture has no authenticated-model catalog entries; live catalog length can differ. Skills, root AGENTS, Ponytail, other tools, external wrapper and histories were not reduced. After discovery the loaded schemas/guidelines are present again, additively; this is initial-context reduction, not permanent erasure.

## Discovery and verification limits

Native search is BM25, not exact-name lookup: `query: subagent, limit: 1` selected `subagent_interrupt` in the regression. A descriptive query `Spawn dedicated terminal worktree` loaded `subagent` with limit 1. Use a descriptive query or widen the limit if the required name is absent; no native ranker was changed.

The SDK regression covers all ten definitions being discoverable/callable, actual safe `subagents_list`, schema-validation and permission refusals without launching, refreshed routing guidelines, additive Codex payload prefixes including loading `subagent`, old direct and current source-baseline resume, partial loadouts and recorded removal (including `subagent_resume`). Existing remote/context safe execution, adapter fallbacks, web activation, queue checks, native handoff and process-only background tests remain in the mandatory gate.

Instruction assertions prove that decision/safety wording reaches the effective permanent prompt. Faux tool sequences and prefix assertions prove the tested SDK mechanics, not autonomous semantic compliance, multi-window retention, real provider availability, token/cache behavior, latency or answer quality. Deployment requires separate approval and a verified backup; already-running sessions keep their recorded declarations. No live CI, provider, Chrome, SSH or Herdr pane work was performed.
