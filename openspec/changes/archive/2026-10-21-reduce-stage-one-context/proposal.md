## Why
The approved stage-one scope removes redundant model context, not capabilities. The source checkout starts clean at 70232350455c1b82ce4a1ffc77e12a85132547f9. No deployment is authorized.

## What Changes
- Retain codemode as the native batch mechanism; document that the currently visible multi_tool_use.parallel is external to the Pi registry/source and cannot be removed here.
- Stop declaring web_enable when all configured web capabilities are already active; preserve lazy activation, renamed/disabled capabilities, resume and reactivation.
- Mark only Ponytail help/gain/debt command-only using native skill metadata; preserve both aliases and /skill: commands.
- Consolidate background inspection guidelines and duplicated task-session/policy prose without weakening queue, recovery, security or evidence rules.
- Capture reproducible offline byte measurements and initial visible names. Do not claim live speed, tokens, cache hits or quality.

## Capabilities
### Modified Capabilities
- `deferred-tool-loading`: conditional web loader declaration and truthful harness boundary.
- `ponytail-context`: three service skills are explicit-command-only.
- `general-agent-policy`: single-owner workflow instructions.

## Impact
Versioned package patches/manifest, APPEND policy and actual SDK regressions. No other tools/skills are deferred or removed; no credentials, Ollama, personal settings, installed maintenance, publishing or deployment changes.
