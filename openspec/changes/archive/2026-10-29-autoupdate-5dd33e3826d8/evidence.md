# Evidence

## Scope and exact versions

Source-only update, no features added. Core/TUI remain 1.4.0; installer already matches and is unchanged.

| Package | Before | Candidate |
| --- | --- | --- |
| @amaster.ai/pi-browser-use | 0.1.31 | 0.1.32 |
| @dietrichgebert/ponytail | 5.3.2 | 5.3.3 |
| pi-markdown-preview | 0.24.0 | 0.25.0 |
| pi-web-access | 0.44.0 | 0.45.0 |
| pine-of-glass | 0.18.3 | 0.18.4 |

Remaining exact targets unchanged and verified: @beyona/pi-zai-usage 1.1.0; @earendil-works/pi-coding-agent 1.4.0; @earendil-works/pi-tui 1.4.0; @ff-labs/pi-fff 0.11.0; @juicesharp/rpiv-ask-user-question 2.15.0; @monotykamary/pi-retry 0.11.3; @spences10/pi-context 0.1.16; context-fold 0.7.0; pi-background-tasks 2.6.10; pi-fast-resume 1.4.18; pi-herdr-agents 3.3.1; pi-ssh-remote 0.1.15; pi-token-speed 0.12.0; pi-train-agents 0.2.7; typebox 1.4.3.

## Patch and lock review

- Initial upstream dry-run with `patch --dry-run --fuzz=0` accepted all three existing patches. No failing behavioral regression and no new behavior fix was needed.
- Ponytail 5.3.3 patch is byte-identical to the 5.3.2 patch.
- Markdown Preview 0.25.0 and Web Access 0.45.0 patches change hunk line numbers only; additions/removals and surrounding context remain unchanged.
- Manifest changes only the corresponding three version/path pairs; managedConfigs and all other metadata unchanged.
- Runtime lock package comparison: five requested direct updates plus @amaster.ai/pi-shared 0.1.31 → 0.1.32 required by browser-use. No unrelated package resolution changed.
- All 20 targets match declarations, lock root dependencies, package lock entries and installed package versions exactly. Package membership, scripts and allowScripts remain unchanged.
- SHA-256 baseline review verified 423 protected existing files unchanged, including prepared configs/settings.json, root package files, tests, scripts, .github, AGENTS.md and existing OpenSpec specs/history. Sandbox has no .git; source review used baseline hashes and direct lock comparison instead of Git diff. Controller owns commits and acceptance.

## Commands and results

- Root `npm ci --ignore-scripts --legacy-peer-deps`: PASS; tooling audit reports zero vulnerabilities.
- `npm install --package-lock-only --ignore-scripts --legacy-peer-deps --prefix npm`: PASS, runtime lock prepared.
- `npm ci --ignore-scripts --legacy-peer-deps --prefix npm`: PASS, no lifecycle scripts enabled.
- `npx --no-install openspec validate autoupdate-5dd33e3826d8 --strict --no-interactive`: PASS.
- `npm test`: **PASS**, Node v24.18.0, all 23 checks exit 0:
  - contracts: openspec, ci-config;
  - unit: harness, release, loop-pilot, queue-checks;
  - integration: patch-apply, patch-verify, context-fold-index, compaction-sdk, stack-surface, native-quota-sdk, deferred-tools-sdk, train-agents, queue-sdk, queue-checks-sdk, task-session-sdk, herdr-ipc-sdk, ponytail-sdk, background-jobs, loop-sdk, context-runtime;
  - smoke: rpc-startup.
- `npm audit --legacy-peer-deps --json --prefix npm`: exit 1, 10 advisories (5 moderate, 5 high, 0 critical). Plain audit without legacy peer mode reports 16 (11 moderate, 5 high). No audit fix or dependency scope expansion was applied. Offline gate PASS is not proof of absence of security vulnerabilities.

## Limits and archive

No paid API keys, provider requests, production writes, deployment, push or Git commit. Mandatory SDK checks used isolated fake/no-provider paths with network denial where required. Real Chrome, SSH, interactive TUI, model quality and external providers are not verified. GitHub Actions CI and host gates are unverified; no host update was authorized. No private settings, credentials, sessions or raw test/npm logs are included in this evidence.

After the full npm test PASS and completed tasks, `npx --no-install openspec archive autoupdate-5dd33e3826d8 --skip-specs --yes` succeeded into `openspec/changes/archive/2026-10-29-autoupdate-5dd33e3826d8/`, preserving protected canonical specs. The delta is retained there for controller review, not merged into protected specs. A second complete `npm test` after archive also passed all 23 checks. Generated npm cache was removed; dependencies and test output remain ignored, not source artifacts.
