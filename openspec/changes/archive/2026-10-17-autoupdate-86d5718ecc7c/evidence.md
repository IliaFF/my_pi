# Verification evidence

## Scope and versions

Portable source only; no deployment, push, commit, personal settings, credentials or sessions. Node v24.18.0, npm 12.0.1. Source supplied without .git; no Git revision/diff available. Controller owns commits and acceptance.

All 19 exact targets match npm/package.json, lock root and installed packages:

```text
@amaster.ai/pi-browser-use 0.1.28
@beyona/pi-zai-usage 1.1.0
@dietrichgebert/ponytail 5.3.2
@earendil-works/pi-coding-agent 1.3.0
@earendil-works/pi-tui 1.3.0
@ff-labs/pi-fff 0.11.0
@juicesharp/rpiv-ask-user-question 2.13.9
@monotykamary/pi-retry 0.11.2
@spences10/pi-context 0.1.16
context-fold 0.7.0
pi-background-tasks 2.6.10
pi-fast-resume 1.4.18
pi-markdown-preview 0.23.0
pi-ssh-remote 0.1.15
pi-token-speed 0.11.0
pi-train-agents 0.2.7
pi-web-access 0.42.0
pine-of-glass 0.17.0
typebox 1.4.2
```

## Regression and repair

1. Root tooling installed using `npm ci --ignore-scripts --legacy-peer-deps`.
2. Runtime lock refreshed using `npm install --package-lock-only --ignore-scripts --legacy-peer-deps --prefix npm`; installed using `npm ci --ignore-scripts --legacy-peer-deps --prefix npm`. No new lifecycle scripts enabled; package names and allowScripts unchanged.
3. First `npm test`: FAIL, with five updater harness errors (`patch pin mismatch`), and patch-apply/verify failures for historical ask-user-question 2.13.8 and Ponytail 5.3.0 manifest versions. Existing integrations correctly withheld after patch failure.
4. Inspected current upstream reconciler and Ponytail before_agent_start implementation. Required session_start reconciliation and request-local skill filtering are still absent. Both existing patches apply cleanly without fuzz/content edits to the new releases. Renamed patches to 2.13.9 and 5.3.2 and aligned manifest version/path/reason metadata only.
5. Full `npm test`: PASS, all 16 checks: OpenSpec, CI contracts, harness, release, loop pilot, patch apply/verify, stack surface, deferred SDK, training, queue SDK, Ponytail SDK, background jobs, loop SDK, context runtime and RPC startup. Mandatory tests use isolated agents and no live provider requests.
6. Additional `scripts/test-release.py .` registry replay verified all seven patches forward/reverse on pristine published archives. First standalone invocation lacked `pi` on PATH; second isolated setup lacked agent/npm/node_modules. Corrected only invocation environment (sandbox agent with runtime node_modules symlink and local bins on PATH); complete release check then PASS, including deterministic compaction with zero model/auth calls.

## Source review

Changed production sources are limited to npm/package.json, npm/package-lock.json, manifest patch release metadata and two patch renames with unchanged contents. Installer core pin remains 1.3.0. No local extension changes needed. Lock has 19 direct dependencies and 423 total package entries (including platform-specific optional entries); all resolved URLs use https://registry.npmjs.org/. Reviewed direct pins, patch hunks and manifest metadata. SHA-256 comparison confirms all 184 pre-existing protected files unchanged, including prepared configs/settings.json, root package files, scripts/tests, specs and archive history. No Git metadata is present, so controller must perform final Git diff/acceptance review.

## Limits

Runtime npm install audit: zero vulnerabilities. Unchanged root OpenSpec tooling audit: four high-severity findings; no unauthorized audit fix or root package change. CI not run. No real interactive rendering, Chrome, SSH, provider or Codex subscription live checks; offline success is not a claim about those services. The expected mcp.json audit drift warning reflects the mandatory sandbox deliberately disabling MCP transports, not a source edit. No paid API keys used. Generated gate logs/results are not retained in source. Archive uses --skip-specs to preserve protected existing specs while retaining this candidate's delta in history.
