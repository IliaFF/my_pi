# Offline acceptance and review

Baseline: clean worktree at 2b7ed41636da2c3d1cf09188dd1b59cf11d8277e; installed Pi 1.5.0. Published pi-subagents 0.87.0 metadata and versioned tarball docs were checked before edits. Peer pi-ai >=1.2.0; all optional Pi peers match the build.

Focused installer and actual SDK/package tests PASS. The real package starts a native child on a faux native provider, returns its result and observes cancellation. Its persisted child session continues using the actual SDK, compacts to a fixture checkpoint and continues again. Tests assert AGENTS/skills discovery, read/bash effective tools, no nested agent capability, model/fanout ceilings, no automatic acceptance reviewer, and background extension co-loading. No real provider or external runner is started.

First npm test failed on 3 stale historical-fixture allowlists and one missing settings binding in the new smoke assertion. Fixtures now explicitly remove the new managed leaves when constructing historical backups; uninstall acceptance was NOT broadened to arbitrary sets. Added pre-terminal backup coverage. RPC now has a temporary no-prompt observer checking the actual subagent tool registration. These failures and their fixes precede the passing gate.

Second `npm test`, without a pipe: exit 0, 29/29 checks PASS, including the 96-test harness, SDK fixtures and real CLI RPC startup. Background job be02bd1d2. The child fixture uses network guards and no credentials; the RPC probe starts no model turn. Full review covered all tracked changes relative to baseline and every owned untracked profile/config/script/OpenSpec file. No unresolved correctness/safety blocker. `git diff --check` PASS. Lock changes only add the pinned package and its dependencies and hoist existing jiti 2.7.0. Old restore sets remain exact. No unrelated changes were present initially.

Python style guide and ponytail-review applied. Autopep8/Ruff unavailable, not installed for this minimal Python fixture/gate edit; unit tests are mandatory. Existing npm audit reports 8 advisories (4 moderate, 4 high) outside pi-subagents/new dependencies; no unrelated audit fix or upgrades.

Local tests and review are executor-controlled, not independent. Live OpenRouter/auth, answer quality, costs, long-running multi-context endurance, detached resume, interactive UI and live Firstmate co-execution remain unverified. Tool selection is not OS isolation; cancellation is not command rollback. No SSH, real subagents, paid calls, pushes or publication. Runtime installation is separately authorized, with backup after this offline acceptance; deployment evidence belongs to the root project report.

## Deployment acceptance

Approved install `./install.sh --preserve-settings --skip-stack`: exit 0, backup created under the configured my-pi-backups root before mutation. Installer host gate: 29/29 PASS, verify failures=0 with 4 audit-only personal snapshot warnings. No core/private-stack reinstall. Main runtime remains openai/gpt-6.1-sol; every pre-existing setting outside the added package/subagents block and all recorded private config/instruction hashes are unchanged. The backup archive's settings match the private pre-install bytes.

Deployment verifier PASS: exactly terminal.md; runtime profile/config equal source; package lock equal source; 665 authored source files match their maintenance copies and 795 pi-subagents package files match the locked source dependency tree, excluding nested dependencies (covered by exact npm lock). No generated caches are counted as authored source.

Separate real runtime RPC smoke PASS with its actual settings/packages in a disposable local cwd: 61 commands, session_start observer sees subagent tool, no extension errors or model turn, council and agent slash commands absent. Network guard and --no-mcp are active. Exact private paths and final deployment evidence are in the root project report, not portable configuration. Restart Pi before using the new extension. Archiving changes source metadata, not the deployed executable configuration; final authored-source synchronization is checked separately.
