# Evidence: explicit ordinary-job completion wake

## Scope and baseline
- User request: allow explicit completion continuation. Authoritative parent TODO task `aaefcfb9b93a`.
- Clean source baseline: `bd07235`; Node24.18.0, Pi SDK/core1.3.0, pi-background-tasks2.6.10. No version/lock/dependency changes.
- Shared registry admission, tool schema/guidelines and EventBus capability changed together. Existing upstream native follow-up delivery is reused; no scheduler, delegates, Fusion, telemetry or new package.
- Default remains notification-only, including `/bg`. Explicit boolean `triggerOnCompletion:true` requires enabled notifications. Agent requests, malformed wake and contradictory notification policy fail before spawn. Existing finite600s default,1MiB cap, bounded logs and Linux process-tree kill remain.

## Red → green and review
- Before changing the patch, the positive actual SDK test failed with `pi_bg_process_only: agent tasks and automatic model wake are disabled` (exit1).
- Final native fixture passes: 7 scripted faux provider requests in6 agent runs; a busy queued continuation is a second request within the same run. No credentials or external requests; global fetch guard records0 network attempts.
- Coverage: tool/EventBus positive and negative admission, explicit idle success/failure, queued busy completion without overlap, explicit kill notification, surviving native reload, default no-wake jobs and `/bg`, no duplicate on reads, shutdown/history suppression. Original timeout/tree kill/output cap/bounded log/default reload/quit checks retained.
- Source `npm test`: exit0,18/18 checks. `python3 scripts/test-release.py`: exit0, exact lock19 direct/423 total entries and published pristine package replay including reverse verification PASS. Old patch reverse/new replay also matched all5 desired files byte-for-byte.
- Reviewed all owned tracked diffs and new proposal/design/tasks/spec deltas; `git diff --check` PASS. No unrelated initial source changes existed. No user logs, dependencies, backup contents or private configuration enter the commit.

## Authorized local activation
- Original installed maintenance gate: exit0,16/16 checks.
- Standard backup initially landed on a Windows mount with mode0777; activation was stopped. The newly created snapshot was moved to a private Linux0700 parent/snapshot, all copied hashes and npm archive checksum were verified, and the Windows copy removed. Private backup location and preservation hashes are retained outside Git in the parent project report/private snapshot.
- Runtime changes are exactly3 compiled files: `dist/src/core/registry.js`, `dist/src/core/extension-api.js`, `dist/src/extension.js`. Original private backup covers npm tree and patched files; no npm install/reinstall was performed.
- Scoped maintenance activation updates this change's README, patch, test and manifest reason only. Existing maintenance/source differences (queue checks config entry and unrelated newer validation specs) were inspected and not deployed incidentally.
- Compared all36559 npm archive members: membership, unchanged file contents and symlinks preserved outside the3 approved compiled files. settings/auth/models/mcp/context-policy/APPEND/meantime/package.json/package-lock presence and bytes preserved.
- Activated installed maintenance gate: exit0,16/16 checks, including real SDK background continuation and patch verification. Host drift: failures0, warnings2 for intentionally preserved settings.json/mcp.json; no snapshot/reset used to hide them.

## Delivery and limits
- Archive and local commit follow passing implementation/activation checks; final post-archive contract/gates are recorded below.
- No GitHub publication, VPS change, current-session reload/restart, paid model call or new operational permission. Fresh processes load the updated package; the active Pi session retains its old loaded schema/policy until the user explicitly reloads/restarts it.
- Faux SDK evidence does not prove live provider, interactive UI or remote-service availability. Wake can consume model tokens/limits. Shell commands remain local and unsandboxed; launching `systemctl start --no-block` does not observe service completion. Cross-session aggregate disk quota and SSH watching remain out of scope.
- Rollback: use the private approved backup per `docs/diagnostics-and-rollback.md`; scoped maintenance originals are retained alongside it. CI and live UI/provider checks were not run.

## Final post-archive acceptance
- Archived as `2026-10-17-allow-opt-in-background-wake`; all implementation/activation tasks checked before archive. Main spec Purpose updated to match opt-in policy. Initial strict main-spec validation caught long requirement warnings; wording was shortened and the same scope/permission limits retained as scenarios. Final `openspec validate --all --strict --no-interactive`:13/13 PASS.
- Final archived source `npm test`:exit0,18/18 PASS; final scoped installed maintenance/host gate:exit0,16/16 PASS. The different totals reflect deliberately preserved older unrelated maintenance contents, not skipped checks in either selected gate. Both include actual native SDK background continuation and full applicable gates.
- Final private settings/auth/locks preservation and all3 activated runtime bytes rechecked after gates. Executable package patch/test/manifest unchanged during the final gates. Evidence-only closure appended afterwards and mirrored to scoped maintenance. No publication/VPS/current-session restart.
