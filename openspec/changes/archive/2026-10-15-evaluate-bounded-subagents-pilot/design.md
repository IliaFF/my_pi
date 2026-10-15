## Context
Current runtime is Pi 1.2.0, with local Codemode/MCP tools, a notification-only shell pilot and task queue. pi-subagents 0.78.0 fixed Pi1.2 compatibility and fork cache/lifecycle issues, but these release claims are not local verification. Native background agents are NOT to be launched through bg_run; use bounded foreground subprocesses for probes.

## Decisions
1. Download the pinned npm package to a private temporary workspace; reuse exact current SDK where possible. Keep evaluation outside production and the mandatory offline gate until stable coverage exists.
2. Use actual SDK execution, in-memory credentials/faux responses and no-network guards for offline checks. Child processes must also receive the guard; report any untested containment. No real agent through the shell background pilot.
3. Define read-only by callable permissions, not reviewer name. Reject live admission on bypasses, false terminal states or uncontrolled output.
4. Live cap: four top-level requests, finite deadlines and no retry, nested spawns or provider switching. Reuse current Codex credential store without printing/copying into source. Record actual requests when observable; a top-level launch cap cannot promise four HTTP requests. Avoid auth refresh writes if unsupported; report blockers rather than changing credentials.
5. Compare the same frozen small code/review fixture and report prompts, findings, rounds, tokens, elapsed time and cache metrics when observed; no causal/performance conclusion from one small sample or prices unsupported by subscription telemetry.
6. Do not add generalized orchestration or replace shell jobs. A negative recommendation is an acceptable complete outcome. Deployment follows full gate and verified scoped backup only if there is a justified runtime change.

## Risks
Third-party package hooks and native tools are unsandboxed. Worktrees do not protect secrets. Fake providers do not prove live quality/cache behavior. Codex OAuth refresh and subscription cost may be unobservable; do not silently switch providers.

## Rollback
Before any runtime write, hash and back up exactly the managed paths changed, preserve credential/session stores, document verified restore. No runtime deployment for a failed evaluation.
