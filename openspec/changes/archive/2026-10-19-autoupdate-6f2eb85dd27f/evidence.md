# Verification evidence

## Scope and result

PASS: dependency-only update pine-of-glass 0.18.0 → 0.18.1. Остальные 18 targets уже совпадали. Все 19 requested pins проверены на точное равенство в npm/package.json, root dependencies npm/package-lock.json, package entries lock и установленных package.json.

Из pre-existing файлов изменились только npm/package.json и npm/package-lock.json. SHA-256 сравнение подтвердило неизменность tests/, scripts/, configs/ (включая подготовленный configs/settings.json), .github/, AGENTS.md, root package files, installer, manifest, patches, local extensions и существующих OpenSpec specs/history. Package names, scripts и allowScripts сохранены. Source pin изменён точечно; lock сгенерирован npm и проверен существующим release gate. Git metadata отсутствует, поэтому Git diff/commit SHA недоступны; controller выполняет независимую проверку и commits.

## Commands

- `npm ci --ignore-scripts --legacy-peer-deps`: PASS, tooling 70 packages. npm сообщил 4 high vulnerabilities в существующем tooling tree; audit fix не выполнялся, защищённые root pins/lock не менялись.
- `npm view pine-of-glass@0.18.1 version dist.integrity scripts --json`: npm registry подтвердил версию и integrity.
- `npm install --package-lock-only --ignore-scripts --legacy-peer-deps --prefix npm`: PASS.
- `npm ci --ignore-scripts --legacy-peer-deps --prefix npm`: PASS, 405 packages, audit 0 vulnerabilities.
- `npm test`: PASS, 18/18 stages, Node v24.18.0, npm 12.0.1.
- `openspec validate autoupdate-6f2eb85dd27f --strict --no-interactive` через локальный npx: PASS.

Lifecycle scripts не включались. Bug regression не применима: плановое patch dependency обновление, без локального исправления поведения.

## Full mandatory gate

Все exit codes = 0:

| Stage | Checks |
| --- | --- |
| contract | openspec, ci-config |
| unit | harness, release, loop-pilot, queue-checks |
| integration | patch-apply, patch-verify, stack-surface, deferred-tools-sdk, train-agents, queue-sdk, queue-checks-sdk, ponytail-sdk, background-jobs, loop-sdk, context-runtime |
| smoke | rpc-startup |

pine-of-glass 0.18.1 integrity: `sha512-1nVNZ0E2gZUOJ1XJscWiEag2OBkjgndnNEonWeDEvz5ybgB4Q5wuCZhR00VS8lD0j/nJhIr18XV/mrMspQXX0g==`.

## Limits and handoff

Никаких paid API keys, model/provider requests, личных settings/auth/sessions/logs, deployment или push. Обязательные tests использовали isolated temporary agent и faux/no provider. Raw test-results/dependencies не включаются в source. CI, controller acceptance и host gate не запускались; Chrome/SSH, реальный TUI и live provider behavior не подтверждены.

Архивирование выполняется только после полного PASS, через OpenSpec `archive --skip-specs` для сохранения защищённых основных specs. Spec delta остаётся в архиве как сценарий проверки данного candidate; существующие контракты не ослаблены.
