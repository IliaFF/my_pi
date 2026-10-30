# Evidence

## Scope and baseline
- Root task: `a2a18f988524`; baseline `70232350455c1b82ce4a1ffc77e12a85132547f9`, initially clean Git worktree.
- Approved source-only stage: conditional web loader, three command-only Ponytail service skills, deduplicated policy. Codemode already enabled; external `multi_tool_use.parallel` cannot be removed from this source layer. This is a disclosed limitation, not a completed schema removal.
- Initial visible names, exact component measurement method, reproduction and harness/cache limitations: `docs/context-stage-one.md`.
- `npm/node_modules` resolves to the dedicated build dependency cache `/home/ilyaz/.cache/pi-build-deps-4aUu0J/npm/node_modules`, not installed personal/project Pi packages. Modified fixtures are ignored; Git source of package changes is the versioned patch/manifest. No user settings, credentials, Ollama, installed maintenance, deployment or push modified.

## Regression before implementation
- Actual SDK Ponytail regression: exit 1, `help must be command-only`.
- Actual SDK web activation regression: exit 1, `Redundant loader must not reach next provider request`.
- Follow-up actual deferred-discovery regression: exit 1, `Discovery must also remove redundant loader`; added shared loadout reconciliation after tool results.
- Final narrow actual SDK Ponytail/web tests: exit 0, fake provider, temporary HOME/agent/cwd, zero attempted external search/fetch/model calls. Full/off aliases and native commands plus standalone native commands preserve actual bodies and arguments.

## Full gate
- First check `150a4dd7-0a85-40c9-bdb3-20542201619c`, job `b4c4445e5`: exit 1, 18/20 checks PASS. Harness/release expected short `Ask the user if uncertain` in APPEND. Restored that short rule, not the long duplicated handoff paragraph.
- Successful replacement check `e13c0e83-b9a8-49f0-9fb9-4411fb1f760f`, job `b4fee7325`: exit 0.
- Exact command/cwd: `npm test && node scripts/measure-stage-one-context.mjs . && git diff --check`, `pi-build/`.
- Full npm gate: 20/20 PASS (OpenSpec, CI YAML, harness, release/pristine patch replay, loop/queue unit checks, apply/verify, stack surface, native quota, deferred tools including actual web loader, training, queue SDK/checks, task-session SDK, Ponytail SDK, background jobs, loop SDK, context runtime and RPC startup). Release gate uses npm registry archives; no paid/live model/browser/SSH checks. CI YAML PASS is not a remote CI run.
- All four background process tools retain their executors/schemas; actual background safety/wake tests pass. Existing rare-tool discovery and additive-prefix regressions still pass; no prefix guarantee is made for removing the now-redundant web loader.

## Measurements
UTF-8 bytes, separate components, not token counts or total request size:
- APPEND: 3982 -> 3345, saving 637.
- SDK-rendered Ponytail advertisements with identical normalized paths and base skill excluded: 2550 -> 1526, saving 1024. Only help/gain/debt advertisements removed.
- JSON of background guideline literals: 1721 -> 1196, saving 525; 11 -> 7 guidelines.
- Actual faux-provider web loader definition JSON: 314 bytes; present before activation, omitted after activation/discovery. Adding actual web tools at the same time is not reported as net whole-request savings.

## Review
Reviewed full owned tracked diff and added files against the clean baseline: APPEND, manifest, cumulative Ponytail/background patches, new web patch, native discovery gate import, Ponytail/web SDK regressions, assert-based measurement script, report, OpenSpec proposal/design/tasks/deltas. Read activation callers (`registerWebToolActivation`, session/tree/run hooks, executor, tool results), loader metadata/aliases and background owning guidelines. Assumed load: local interactive Pi sessions with concurrent tool calls, not a multi-tenant service.

Review found an over-broad old no-unload spec and old all-skills-discoverable wording. Deltas now explicitly retain the five rare tools' additive behavior while permitting the approved web-loader removal and command-only service metadata. No remaining correctness/security findings in the owned scope. Schemas, network executors and process admission were not rewritten; no new dependency or generic prompt-rewriter layer.

## Closure
Implementation tasks and gate are complete; archive/commit follow this evidence. A final snapshot-bound full check is required after archive/commit and will be recorded in the root authoritative TODO rather than editing this archived evidence and invalidating that snapshot again.

Not verified: live provider request tokens/cache/latency/quality, deployed runtime behavior, external harness schema changes, remote CI. Installing this source remains a separate approved operation with backup; already patched same-version packages must be restored/reinstalled to pristine before applying the new cumulative patches, not blindly patched twice.
