# Evidence

## Baseline and scope
- Authoritative root task `2c1be340ebea`; source initially clean at `d5557a7bb990a6efea422ec99a52efdad4bdf288`. Root fresh_pi is not a Git repository. No unrelated tracked/untracked source changes existed.
- Build dependencies are a dedicated cache (`/home/ilyaz/.cache/pi-herdr-source-zAYdPe/node_modules`), not personal runtime. Only versioned patch/manifest are package-change sources.
- Owned scope: permanent APPEND, managed discovery names, Herdr patch/manifest, existing deferred SDK regression, measurement/report and this OpenSpec change. No production, private settings/auth/history edits, Focus, real child launches, paid models, remote service operation, push or publication.

## Regression sequence
- Before implementation: actual SDK deferred test exit 1, `worktree_list must register deferred` (actual direct).
- Discovery probe: `query: subagent, limit: 1` loaded `subagent_interrupt`, not an exact-name match. Native BM25 is unchanged. Descriptive query `Spawn dedicated terminal worktree` loads the intended tool with limit 1; the limitation is documented.
- Added catalog regression failed against snapshot-only SDK registration: effective instructions retained `Authenticated subagent model catalog becomes available after session start` instead of a refreshed catalog. Re-registering the same deferred definition after the existing catalog update fixes this; no executor/schema change or child activation.
- Final narrow SDK test: exit 0. All ten Herdr definitions discoverable/callable; real safe subagents_list; malformed launch arguments rejected by native validation, valid launch blocked by tool_call permission hook. No launch executor invoked. Live pane/subagent environment variables are removed/restored around the fixture.
- Actual provider context after subagent discovery contains the refreshed catalog. Supported Codex payload instructions/cache key/prior serialized input prefix remain stable with additive tool/guideline changes. Legacy all-direct and actual source-baseline loadouts survive resume; partial loadouts and explicit context_stats/subagent_resume removals remain removed. Existing fallback/web assertions pass. Zero network attempts in the SDK fixture.

## Measurements
See `measurements.json` and `docs/standing-prompt-reduction.md` for exact scope/reproduction. Read-only current-session inventory exported only section sizes and tool names, no raw prompt or secrets. Initial recorded session: 31 Pi declarations, 38,909 bytes of schema JSON; section contents 31,071 chars / 32,739 bytes including skills/project/Ponytail/transport metadata, not only runtime. Codemode later listed 135 callable names, not total registered count. External parallel wrapper is outside this source boundary.

Controlled actual-package SDK fixture before/after (same candidate APPEND and catalog refresh; old direct Herdr exposure/two full snippets versus candidate):
- Tool-definition JSON: 23,537 -> 9,238 UTF-8 bytes; saving 14,299, search overhead included on both sides.
- tools section content: 4,281 -> 714 bytes; rules: 3,522 -> 564 (empty-auth fixture). Combined saving 6,525 bytes / 6,509 chars.
- Permanent source APPEND: 3,793 -> 4,266 bytes, growing 473 to retain required decision/safety rules after deferral.
- Net affected-component saving: 20,351 bytes. Not full request serialization or exact provider tokens. The older all-direct comparison's 19,817 schema-byte saving is not attributed to this change.

## Full gate and review
- Pre-archive snapshot check `dad9f9df-9255-43d4-aee3-f8ef468e8396`, background `b62531287`: `npm test && git diff --check`, cwd pi-build, exit 0; all 22 stages pass.
- Includes strict OpenSpec, unit/release pristine published-package patch replay, apply/verify, real SDK discovery and web activation, queue/checks/native handoff, Herdr IPC, Ponytail, shell background safety, context runtime and RPC startup. Release tests fetch npm archives; no paid provider requests. This is not a real remote CI job.
- Full owned tracked/untracked diff reviewed against the clean baseline, including the complete new patch, report, JSON measurements and spec deltas. Inspected registration guards/role denial, original executors, dynamic catalog update, SDK guideline snapshot/registration and existing branch loadout replay. Assumed load is a local single-user Pi process, not a multi-tenant service. No remaining confirmed correctness/security findings in the owned scope.
- No new dependency, loader, model classifier, broad prompt rewrite or executor wrapper in production. Regression reused the existing SDK gate. Original schemas/executors/permission boundaries remain intact.

## Closure and limits
Archive/commit follow the passed gate. Final committed/archive gate and supersession of the pre-archive snapshot are recorded in root TODO so that this evidence does not invalidate its own final check.

Not verified: autonomous compliance with instructions, real >1-window task continuity, live auth/model availability, provider token counts/cache hits/latency/quality, UI/pane behavior, Chrome/SSH, remote CI or deployed runtime. Existing sessions retain declared schemas; fresh-default savings require a separately approved deployment/reload/new session. No such installation is authorized here.
