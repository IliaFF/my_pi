# Evidence

## Scope and authorization

The operator confirmed the GPT/DeepSeek division: GPT plans, writes production code and accepts results; terminal is the default for other bounded non-production execution, including short routine assignments. Standard Pi tools and the production prohibition from commit 0b5f373 remain unchanged. Standing delegation is bounded by the current task and approved model budget; extra services, authority and substantial resources still require consent. No actual DeepSeek/model calls, SSH, installation, runtime update or production edits were performed.

## Sources and baseline

Git pi-build started clean at 0b5f373. Inspected managed APPEND/profile, root AGENTS, portable documentation, general-agent-policy and portable-user-stack specs, existing SDK and policy unit tests. Applied ponytail-review and python-styleguide for the Python test update. Installed package docs inspected in the preceding related change still describe the unchanged profile/tool mechanism; no runtime profile was imported into Git.

Root /mnt/d/Work_Projects/fresh_pi/AGENTS.md is outside the pi-build Git repo. Its initial copy is /tmp/fresh-pi-agents-before-terminal-routing.md (transient local artifact). Before SHA256: a099b5b36ec4267f6d14d77e836028d391981f6dcf5176ccfac27f2fbe393b8c. After SHA256: 440006550ff0f355bb2a2ffc2c09baeb552c004b0bf9a47ca2c22a2d24a2be41. Its separate diff preserves all build and lifecycle rules and only scopes the threshold/adds the terminal workflow. TODO history and unrelated files were preserved.

## Checks and review

- New parent SDK assertion failed before instruction edits: test-deferred-tools-sdk.mjs exited 1 because the terminal exception was absent; /tmp/terminal-routing-before.log.
- Updated parent and child SDK regressions passed: test-deferred-tools-sdk.mjs and test-terminal-sdk.mjs exited 0; /tmp/terminal-routing-after.log and /tmp/terminal-routing-child.log. Synthetic providers inspect actual assembled prompts and the seven-tool capability set; no live provider is contacted.
- Initial full npm test exited 1: 28 stages passed; unit/harness retained the old small-scouts-in-parent expectation in tests/multiwindow_policy_test.py. Replaced that obsolete expectation with the terminal exception and GPT ownership while retaining other threshold/authorization assertions.
- python3 -m unittest discover -s tests -p multiwindow_policy_test.py: 2 tests passed. autopep8 and Ruff are unavailable on PATH; formatting command exited 127, no tool was installed and no substitute formatter was used.
- Corrected full npm test exited 0: all 29 stages passed, including 96 harness tests and actual SDK integrations. Node v24.18.0, Python 3.12.3. Local ignored artifacts: test-results/results.json and per-stage logs.
- Final archived-state npm test exited 0 again with all 29 stages passing. Strict post-archive OpenSpec validation passed all 29 items; only this evidence entry was added after that full gate, followed by final validation/diff checks.
- Strict change validation passed; git diff --check passed. Reviewed full owned policy/profile/docs/SDK/unit/spec changes and separate root AGENTS diff; no actionable findings. Parent and child now agree on short-task eligibility; all production/safety and operational controls remain.

## Limits

Author can edit both tests and instructions; review is not independent. Offline prompt delivery/capability tests do not prove model obedience, live availability, lower cost, latency or long multi-context continuity. Bash/edit/write have user filesystem authority, not an OS sandbox. No live run, CI job or installed-runtime activation was tested. Python formatter/linter remain unverified because unavailable. Existing SDK extensions: [] warnings are unchanged and tests pass.
