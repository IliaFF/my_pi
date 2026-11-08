# Evidence

## Authorized scope

The operator approved non-production code/edits only, including tests, fixtures, disposable scripts and documentation not shipped with or used by the working product. Product code remains forbidden even in development. The operator additionally authorized standard Pi tools and approved full npm test, diff review, archive and local commit. No runtime update, real model run, SSH, installation or paid call was authorized or performed.

## Sources inspected

- Git: configs/agents/terminal.md, configs/APPEND_SYSTEM.md, docs/portable-stack.md, manifest.json, scripts/install-terminal-subagent.mjs and its tests, portable-user-stack and build-validation specs.
- Installed documentation only: pi-subagents README.md, docs/agents.md and external-cli-agent-profiles guide; Pi SDK tool exports confirm the seven standard tools. Installed profile/runtime was not used as a source to overwrite Git and was not edited.
- Initial pi-build Git status was clean. Root TODO history was preserved; only this task was added.

## Checks

- Before profile edit: node scripts/test-terminal-sdk.mjs npm/node_modules exited 1 on the new non-production permission assertion; old source-edit prohibition was present. Diagnostic: /tmp/terminal-policy-before.log (local transient log).
- After policy edit: same command exited 0; /tmp/terminal-policy-after.log.
- After standard-tool approval: same command exited 0; /tmp/terminal-policy-tools.log. Actual child capability audit is exactly read, bash, edit, write, grep, find, ls. Existing no-recursion, inheritance, model/fanout ceilings, cancellation and continuation checks remain.
- npm test exited 0: all 29 checks passed, no setup errors, Node v24.18.0, Python 3.12.3. Details: test-results/results.json and per-check logs (local ignored artifacts, not committed).
- After archive/spec merge, npm test exited 0 again with all 29 checks passing. Strict OpenSpec validation passed all 29 items; git diff --check passed. Only this evidence line was added after the final full gate; final strict validation and diff checks also cover that documentation update.
- git diff --check passed. Full owned profile, parent instructions, usage and SDK diff reviewed with ponytail-review; no actionable findings. Installer refuses conflicting installed profiles by design; no deployment attempted.

## Limits

The synthetic provider checks actual SDK prompt delivery and capabilities, not model obedience or answer quality. Bash and editing tools retain user filesystem permissions: this is not an OS sandbox. The author can change both instructions and tests; review is not independent. No live OpenRouter, production install, remote service, CI job or long multi-context execution was tested. Existing extensions: [] SDK warnings are expected; all checks passed.
