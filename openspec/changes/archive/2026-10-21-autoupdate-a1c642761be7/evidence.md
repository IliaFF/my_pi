# Verification evidence

## Candidate

Extension-only обновление: `@amaster.ai/pi-browser-use` 0.1.28 → 0.1.29, `pi-token-speed` 0.11.0 → 0.12.0, `pi-web-access` 0.42.0 → 0.43.0. Изменены npm/package.json и npm/package-lock.json; membership, scripts и allowScripts сохранены. Core/TUI, manifest, installer, patches и local-extensions не требовали изменений.

Проверены declaration, lock root, lock installed entry и фактически установленная версия для каждого из 19 targets:

| Package | Exact version |
| --- | --- |
| @amaster.ai/pi-browser-use | 0.1.29 |
| @beyona/pi-zai-usage | 1.1.0 |
| @dietrichgebert/ponytail | 5.3.2 |
| @earendil-works/pi-coding-agent | 1.3.0 |
| @earendil-works/pi-tui | 1.3.0 |
| @ff-labs/pi-fff | 0.11.0 |
| @juicesharp/rpiv-ask-user-question | 2.13.9 |
| @monotykamary/pi-retry | 0.11.2 |
| @spences10/pi-context | 0.1.16 |
| context-fold | 0.7.0 |
| pi-background-tasks | 2.6.10 |
| pi-fast-resume | 1.4.18 |
| pi-markdown-preview | 0.23.0 |
| pi-ssh-remote | 0.1.15 |
| pi-token-speed | 0.12.0 |
| pi-train-agents | 0.2.7 |
| pi-web-access | 0.43.0 |
| pine-of-glass | 0.18.1 |
| typebox | 1.4.2 |

## Commands and results

Node v24.18.0. Все команды выполнялись в рабочем candidate, без deployment.

- `npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund`: PASS, tooling installed.
- `OPENSPEC_TELEMETRY=0 npx --no-install openspec new change autoupdate-a1c642761be7`: PASS, до правок pins.
- `npm install --package-lock-only --ignore-scripts --legacy-peer-deps --no-audit --no-fund --prefix npm`: PASS.
- `npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund --prefix npm`: PASS, 405 packages; lifecycle scripts не запускались.
- `npm test`: **PASS**, exit 0, 19/19 stages, setupErrors empty.

Успешные stages: openspec, ci-config, harness, release, loop-pilot, queue-checks, patch-apply, patch-verify, stack-surface, native-quota-sdk, deferred-tools-sdk, train-agents, queue-sdk, queue-checks-sdk, ponytail-sdk, background-jobs, loop-sdk, context-runtime, rpc-startup. Это unchanged mandatory gate, включая real SDK/faux provider и RPC без prompt.

## Review and safety

SHA-256 сверка 276 protected файлов после gate: без изменений, включая подготовленный configs/settings.json, root package files, tests/scripts/configs/.github/AGENTS и существующие OpenSpec specs/history. npm/package.json просмотрен целиком; три targeted replacements. Lock root точно совпадает с declarations, все 19 installed entries совпадают с targets. Lock имеет 424 entries; npm сохранил registry integrity metadata. Наличие hasInstallScript у upstream dependencies не означает разрешение запуска: все npm операции выполнялись с --ignore-scripts, allowScripts не менялся.

В workspace нет .git: `git status` сообщает not a git repository, revision в report null. Поэтому полный Git diff относительно baseline здесь недоступен; выполнены file-level/structural review и protected integrity comparison. Git diff и acceptance остаются контроллеру. Зависимости и test-results — только generated ignored artifacts, не source deliverables; runtime logs/credentials/sessions в change не копировались.

## Limitations

Это не bug fix; failing behavior regression до обновления не заявляется. Новых возможностей и ослабления проверок нет. Никаких paid API keys/live model calls, personal settings/runtime writes, deployment, commit или push. Hosted CI, host gate, live Chrome/SSH и интерактивный rendering не проверялись. Архивирование выполняется только после PASS через OpenSpec --skip-specs, чтобы сохранить protected main specs; delta сохранена как evidence контракта выбранного candidate.
