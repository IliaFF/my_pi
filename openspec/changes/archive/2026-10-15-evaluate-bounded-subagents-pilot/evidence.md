# Evidence: bounded subagent pilot

## Scope and versions

Root TODO `4489e8643b0f`. Source baseline `2352562`; Pi1.2.0, Node24.18.0, pi-subagents0.78.0. User authorized current Codex only, at most four model launches, no nested delegation/other providers; scoped backup-protected deployment permitted after checks. Source was clean before this change. No production package/settings/credential writes or package additions were performed.

Pinned npm tarball was unpacked into a private `/tmp/pi-subagents-eval.KImxAv` workspace. Only its dependencies were installed there (`--ignore-scripts --legacy-peer-deps`); core/AI/TUI/agent-core/typebox resolve to the exact existing source SDK. This is a compatibility probe of actual SDK code, not mock ExtensionAPI callbacks. The portable probe now installs its network guard itself and puts package artifacts, HOME, agent dir and caches under its own temporary directory, removed in finally. Initial exploratory public runs used the package's default per-UID temporary artifact directory; they contain only the synthetic fixture, not credential stores.

## Offline checks

`node scripts/evaluate-subagents.mjs npm/node_modules EXTRACTED_PACKAGE` exits0 naturally under an outer100s timeout. Covers:

- `bash` permission deny rejected explicitly: upstream permissions intentionally do not restrict bash; default hard budgets restrict search/read tools, not every tool.
- Direct and native-Codemode write denials preserve a file canary; direct and nested hard wildcard budgets count/block calls.
- Explicit read-only tool selection rejects write directly and through Codemode.
- Invalid structured output is rejected before capture; valid output is captured.
- SDK abort prevents a running bash fixture's delayed write.
- Actual native foreground child factory inherits faux provider, enforces deny, persists output and preserves both results after resume.
- Full public subagent tool on actual SDK completes a read-only foreground child and returns its output. Default child declares `read,contact_supervisor`; quiet profile declares only `read`, creates no new mission files and has no mission footer.
- Parent eager declarations: 5,341 JSON characters across four tools; subagent schema3,357; system prompt1,878. These are fixture measurements, not production token counts.

Detached ownership/stop/wake, true fork cache reuse and arbitrary MCP/SSH/custom tool bypasses are NOT validated. Node network guard is not an OS sandbox. Permission/codemode claims above apply to the tested native tools only. Do not enable background agents on this evidence.

## Frozen live fixture

```js
let active = 0;
const limit = 1;
export async function reserve(save) {
  if (active >= limit) throw new Error('full');
  await save();
  active++;
  return active;
}
export function recent(items, n) {
  if (!Number.isInteger(n) || n < 0) throw new Error('bad count');
  return items.slice(-n);
}
```

Same prompt for every run: review this JavaScript for correctness only; n=0 requests no items and reserve must not admit over limit. Return concise JSON findings with line/problem/fix; do not use tools or request delegation. The two faulty behaviors were assert-characterized before live calls.

## Live Codex: four launches, no retries/fallback

Model `openai-codex/gpt-6.1-sol`, thinking low. Native compat advertises supportsAdditionalTools and supportsMidConvoSystemMessages. Two fresh sessions plus two public tool runs (faux parent, one real child each); no live parent orchestration was charged or evaluated. All reviewed the same embedded frozen JS fixture with two characterized bugs: increment after an await admits concurrent reservations over limit; `slice(-0)` returns all items when zero were requested. Each result correctly found both. This is synthetic smoke coverage, NOT a real-repository review-quality benchmark.

| Path | Input | Output | Reported turns | Elapsed ms |
|---|---:|---:|---:|---:|
| Direct SDK, no tools |581|85|1 assistant completion|3844|
| Native child factory, no tools |581|86|1 assistant completion|3196|
| Public subagent, default bridge |1731|206|2|11168|
| Public subagent, quiet profile |442|85|1|3800|

All reported cacheRead/cacheWrite0. Public default child made a `contact_supervisor` progress_update saying it had found the two issues and was about to return. Quiet run had no tool calls. Model/role/task/thinking were identical between the two public runs; bridge and automatic missions were disabled together. The reduced declaration and removal of the progress tool are verified mechanisms; these four single samples do not establish average latency, general quality or savings. Lower quiet input vs direct SDK also reflects its replacement role prompt, not a proven subagent advantage.

Four top-level launches do not mean four HTTP requests; default public child reported two model turns. Catalog cost fields are NOT a verified subscription bill, so no dollar-savings claim is made. Codex credentials were read locally, copied only for the selected provider into0600 temporary auth files, and removed on cleanup. Tokens had over20min remaining; no refresh was required. Original auth hash unchanged after each live script. No secrets or session transcripts in Git.

Local raw report/logs and one-off live reproduction scripts: `/tmp/pi-subagents-eval.KImxAv/`; this path is ephemeral, not a portable runtime dependency. Portable source is the offline probe and this experiment protocol.

## Decision

Do NOT globally install/activate pi-subagents yet. On the small task a plain agent already found both bugs; usefulness of independent review on our actual larger work is not established. Adding a package, four tools and coordination instructions globally would contradict the goal of reducing duplication without a demonstrated workload benefit. There are no runtime files to deploy or back up for this no-install outcome. Keep existing notification-only process pilot unchanged.

For a future explicitly requested one-shot independent-review evaluation, the tested narrow profile is:

```json
{
  "asyncByDefault": false,
  "forceTopLevelAsync": false,
  "defaultSubagentContext": "fresh",
  "toolActivation": "auto",
  "maxSubagentDepth": 1,
  "maxSubagentSpawnsPerRun": 1,
  "maxSubagentSpawnsPerSession": 1,
  "activeRunsPrompt": false,
  "intercomBridge": { "mode": "off" },
  "missions": { "enabled": false }
}
```

Use an explicit read-only role without bash/mutation tools, no nested delegation; per-run wildcard budget and deadline. Bridge-off disables interactive supervisor questions as well as progress; blocked one-shot reviewers must return a limitation, not wait for decisions. This is an isolated candidate, not installed production policy. Eager activation was used for deterministic offline declaration measurements; production auto/dynamic behavior with current extensions remains unverified. No fork/performance claim.

Correction to preliminary chat research: the actual0.78.0 `agents/reviewer.md` is read-only (`acceptanceRole:read-only`, no bash/write/edit); the package-page summary was inaccurate. Read-only is not a filesystem/security sandbox and tools/extensions must still be validated.

## Acceptance

- Latest isolated offline probe: PASS, including quiet/no-mission checks.
- Live cap exhausted4/4: all four succeeded; no additional live runs authorized.
- Background b805c2227: exit0. `npm test`: all15 PASS; `npm test -- --agent "$HOME/.pi/agent"`: all15 PASS; final portable probe under100s: exit0; staged whitespace check: PASS. Source/probe scope stayed frozen during the job.
- Full owned source and non-code staged diff reviewed; no runtime/package lock/credential changes. Native-only permission claims, sample-size limits, auto-activation and untested detached/MCP boundaries retained explicitly.
- Archived as `2026-10-15-evaluate-bounded-subagents-pilot`; generated canonical Purpose filled and reviewed.
- Final post-archive scope: source `npm test` all15 PASS; installed `npm test -- --agent "$HOME/.pi/agent"` all15 PASS; portable probe14 assertions/check groups PASS, natural exit0 under100s. Final owned diff reviewed, staged whitespace PASS. No live calls after4/4.
