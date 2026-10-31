# Verification evidence

## Scope and exact versions

Обновлены @amaster.ai/pi-browser-use 0.1.32 → 0.1.33, pi-markdown-preview 0.25.0 → 0.26.2 и pi-web-access 0.45.0 → 0.46.0. Остальные 17 direct pins остаются без изменений; core/TUI 1.4.0. Отдельная assertion-проверка подтвердила все 20 user targets одновременно в npm/package.json, корневых dependencies lock, node_modules lock entries и установленных package.json. Package names, отсутствие scripts и allowScripts сохранены.

## Patch preservation

Оба старых патча успешно прошли dry-run на pristine target packages: Preview с offset 68, Web Access с offset 800. Новые versioned patches содержат прежние hunks с обновлёнными line numbers; manifest ссылается на target versions. Никакого нового поведения или исправления тестов не потребовалось, поэтому failing regression не создавалась искусственно. Full gate проверил registry replay, применение/reverse verification и actual-package SDK.

## Commands and results

- `npm ci --ignore-scripts --legacy-peer-deps` — PASS, tooling audit 0 vulnerabilities.
- `npm install --package-lock-only --ignore-scripts --legacy-peer-deps --prefix npm` — PASS.
- `npm ci --ignore-scripts --legacy-peer-deps --prefix npm` — PASS, 408 packages installed; lifecycle scripts отключены.
- `npm test` — PASS, все 25 stages, Node v24.18.0. Включены strict OpenSpec, CI contracts, Python harness, release/registry patch replay, portable stack, bootstrap, unit queue checks, patch apply/verify, context-fold, compaction SDK, stack surface, quota SDK, Firstmate SDK, deferred tools SDK, train-agents, queue SDK, queue checks SDK, task session SDK, Ponytail SDK, background jobs, loop SDK, context runtime и RPC startup.
- `openspec validate autoupdate-c2aaf97f9205 --strict --no-interactive` — PASS.
- Exact-target assertions — PASS для всех 20 dependencies; scripts/allowScripts unchanged.
- После OpenSpec archive выполнен повторный полный `npm test` — PASS, все 25 stages; strict validation существующих 19 specs также PASS. Сгенерированные cache, Python bytecode и raw test logs удалены из рабочей копии после проверки.

## Dependency audit limitations

Install summary сообщил 11 vulnerabilities (6 moderate, 5 high). Отдельный `npm audit --json --prefix npm` завершился с exit 1 и сообщил 29 affected package entries (24 moderate, 5 high, 0 critical). Это разные наблюдаемые ответы registry audit; clean audit не заявляется. High entries: body-parser, chromium-bidi, puppeteer-core, undici, zod. Автоматический audit fix не запускался: нельзя менять утверждённые прямые pins или добавлять несвязанные изменения. Offline PASS не означает отсутствие security bugs или проверку live transports.

## Source review and boundaries

Git metadata в рабочей копии отсутствует; commit/revision и acceptance остаются controller. Вместо git diff выполнен SHA256 inventory review относительно snapshot до runtime edits: изменились только npm/package.json, npm/package-lock.json и patch metadata manifest.json; старые два patch filenames заменены на target filenames. Прочие существующие source files, включая tests/, scripts/, configs/, .github/, AGENTS.md, root package files, installer, managedConfigs и существующие OpenSpec specs/history не изменены. New OpenSpec artifacts — только этот change.

Подготовленный configs/settings.json сохранён byte-identical, SHA256 `45a40007c462b1d68342ca56d6881236a999233e5138b32d39cba29e4c73dcdc`.

Архивация использует OpenSpec `--skip-specs`, чтобы сохранить protected существующие specs; delta остаётся в архиве для controller. Raw test reports/cache не являются release source. Credentials, personal settings, sessions и private logs не копировались. Paid API calls, deployment и push не выполнялись. CI, реальные UI, Chrome, SSH и live providers не проверены.
