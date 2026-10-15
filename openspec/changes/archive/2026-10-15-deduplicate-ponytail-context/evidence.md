# Evidence

## Baseline and failing regression

Source lock: Pi SDK 1.2.0, Ponytail 5.2.0, Node v24.18.0. Working tree was clean before this change. Read parent TODO, build AGENTS, relevant specs, native extension/SDK/skill docs and examples before implementation.

Before the patch, `node --require ./scripts/no-network.cjs scripts/test-ponytail-sdk.mjs npm/node_modules` exited 1 with `AssertionError: full: base skill discovery` (`true !== false`). The real provider callback captured the actual effective session prompt. Assertions execute outside that callback, because SDK converts callback exceptions into model errors; the regression explicitly checks successful model completion and observes agent_settled for asynchronous alias dispatch.

## Implementation and regression coverage

Only the current run's skill array is filtered for lite/full/ultra. Loader resources and base SKILL.md are unchanged. The mode-specific injected body remains intact. Off restores auto-discovery on the following run; persisted independent review and extension-free standalone retain it. Explicit `/skill:ponytail`, `/ponytail-review`, `/ponytail-audit` expand the actual skill bodies and arguments. Review/audit request session-language prose and headings, retaining scope and output structure.

A versioned three-file maintenance patch and manifest entry preserve these changes across reinstall. No dependency added or changed; mandatory gate adds actual SDK integration, not a mocked callback. Tests use temporary HOME/agent, in-memory credentials, faux provider, network guard and finite subprocess deadline.

## Validation

- Focused real SDK regression: exit 0; full/lite/ultra/off/full, body preservation, unchanged loader, manual base/review/audit commands, independent review, standalone and language checks PASS; 0 network attempts.
- `openspec validate deduplicate-ponytail-context --strict --no-interactive`: exit 0.
- Patch forward dry-run/apply and reverse dry-run against source-lock package: exit 0. Blank unchanged context lines use GNU patch-compatible empty lines so Git whitespace gate stays clean.
- `npm test`: exit 0, all 14 checks PASS after final executable patch changes. Includes strict OpenSpec, contract/unit/release, patch apply/verify, stack surface, train-agents, Ponytail SDK, background jobs, loop SDK, context runtime and real configured RPC startup.
- Complete staged diff reviewed: manifest, patch, mandatory gate, complete new SDK test, README and all change/spec files. `git diff --cached --check`: exit 0. No unresolved findings; no new wrapper/config flag or global skill disablement.
- Post-archive `npm test`: exit 0, all 14 checks PASS, including strict canonical specs validation. New canonical Purpose completed; archive preserved all delta specs and evidence. Direct assertions confirm personal/project Ponytail copies still contain the old English instruction and no new filtering code: activation was not performed.

## Delivery and limits

Archive and source commit follow these gates; Git records the actual revision. Production installation is not part of this change. Personal `~/.pi/agent`, installed maintenance and project `.pi/npm` were not modified; the patch was exercised only in repository test dependencies. No push, real model/search/browser request or paid call.

Hosted CI, real interactive rendering, actual language adherence by a paid model, tokenizer savings, latency and cache effects remain unverified. Previously loaded instructions in existing history are not retroactively removed. Older hosts without structured prompt options keep the existing fallback; no new deduplication guarantee is claimed for those hosts.
