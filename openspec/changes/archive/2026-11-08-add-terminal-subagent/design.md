# Design

## Scope and flow

Pinned package + portable profile/config -> preservation-mode installer with backup -> offline SDK/RPC acceptance -> verified runtime. No new orchestration extension or model router.

## Decisions

Use pi-subagents 0.87.0 from its published npm tarball (Pi 1.5.0; pi-ai peer >=1.2.0). Read its docs/agents.md, docs/models.md and docs/configuration.md, not main. Filter all package prompts and skills; disable builtins. Install one terminal.md with explicit model, read/bash allowlist, empty extensions, fresh context, repository/global instruction and skill inheritance, no nested subagents. The parent keeps planning, edits and acceptance. Bash is not a sandbox and can write files; child SSH routing is not inherited.

Use native foreground child sessions by default to avoid duplicate background/Firstmate extension instances. Preserve actual package resume/compaction behavior rather than inventing a persistent worker. Configure one child per run and concurrency one, depth one, finite runtime/tool defaults and disable schedules/automatic resumption. Existing background shell pilot remains shell-only. Firstmate is not modified or launched; compatibility claims are limited to offline co-loading and no tool conflicts.

Preserve unrelated settings, including main model, instructions/auth/MCP/skills. Refuse conflicting existing terminal/config files rather than overwriting. Add managed leaf paths to backup and retain historical restore sets. Maintenance must not import personal profiles into source.

## Verification and trust

Actual SDK + package tool with scripted faux provider verifies child creation, result, continuation and cancellation; inspect context/tools and wrong-model/depth/budget rejection. Mandatory npm test includes no-prompt RPC startup with package ownership assertions. Runtime install follows source PASS/review and uses --preserve-settings --skip-stack; verify backup and installed bytes plus startup without prompts. Local tests are executor-controlled, not independent. No OpenRouter availability, DeepSeek quality, cost, real compaction endurance, real interactive UI or live Firstmate claims.
