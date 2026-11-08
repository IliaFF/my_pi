# Design

Keep one terminal profile, its model, seven standard tools and current timeouts/concurrency. Route coherent batches of search/inspection, command execution, tests, diagnostics, non-production scripts and documentation to terminal by default, including short tasks. Do not spawn a child for each individual shell command.

The GPT parent still reads necessary source and evidence for planning, production edits and acceptance. Terminal does not own product decisions and never writes or modifies production code. When it encounters ambiguity, unavailable tools or scope/resource expansion it reports the blocker rather than silently widening authority. A parent must not silently take over routine execution if terminal is unavailable: report the limitation and agree a fallback with the user.

The multi-context threshold remains for agents other than terminal. For terminal, standing operator authorization covers routine delegation within the assigned task and approved model budget, not unlimited spend or new providers. Destructive actions, SSH, installation, production operations and substantial resource growth still need their own authority. The present source-only change makes no live calls.

Change the root AGENTS threshold to exclude terminal as well as the Git template; preserve its unrelated build/continuity rules. Root AGENTS is not inside the pi-build Git worktree, so keep a before-copy and review its separate diff rather than pretend it is in the commit. No personal runtime source is copied or edited.

# Verification

Extend existing real Pi SDK tests with synthetic providers: the assembled parent prompt must contain the short-task exception, default routing, GPT ownership, batching and resource/fallback limits, and the child must retain the production prohibition. No real model or agent is launched. Run full npm test and strict OpenSpec validation, review all owned tracked/untracked changes plus the separate root AGENTS diff. These checks test instruction delivery, not autonomous compliance, latency, cost savings or OS enforcement. They are editable by the author, not independent control.
