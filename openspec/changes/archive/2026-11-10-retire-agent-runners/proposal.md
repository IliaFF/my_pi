# Proposal

## Why

Оператор прекращает использовать агентские раннеры: ни pi-subagents, ни pi-herdr-agents, ни роль `terminal` больше не нужны. Сейчас source-сборка всё ещё держит pi-subagents и конфиг terminal-роли, несохранённая правка заменяла его на Herdr, а постоянные инструкции требуют передавать работу `terminal`. Живой runtime уже объявляет делегирование отключённым, поэтому source и установленный профиль расходятся. Стандартный функционал Herdr (CLI, сервер, панели мультиплексора, `stack/lock.json`) остаётся и не затрагивается.

## What Changes

- **BREAKING**: удалить агентские раннеры из source: пакеты pi-subagents и pi-herdr-agents, `configs/subagent`, `configs/herdr-agents`, `configs/agents/terminal.md`, локальное расширение `herdr-agent-state.ts`, их install/uninstall-ветки, манифест-снимки, патч и npm lock.
- Заменить в `configs/APPEND_SYSTEM.md` разделы делегирования и `terminal`-workflow на одно правило: агентские процессы отключены, работа выполняется напрямую неагентскими инструментами, обычные фоновые shell-задачи разрешены, включение только по явному разрешению.
- Убрать из обязательного gate проверки retired адаптеров (`terminal-install`, `terminal-sdk`) и добавить независимую проверку отсутствия агентских раннеров и ссылок на них.
- Удалить спек ретирируемых возможностей и соответствующие docs, оставив историю в архиве changes.
- Выполнить `npm test`, review owned diff, backup и установку обновлённой сборки в живой профиль с `verify`, затем коммит и push `origin/main`.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `general-agent-policy`: постоянное правило «делегирование отключено» вместо terminal-workflow и правил резервного исполнителя.
- `portable-user-stack`: инвентарь без агентских раннеров, без terminal-роли и без конфигов Herdr-agents.
- `build-validation`: gate без проверок retired адаптеров, с проверкой отсутствия раннеров.
- `deferred-tool-loading`: снятие специализированного требования про eager terminal.

### Removed Capabilities

- `bounded-subagents-evaluation`, `herdr-agents-adoption`, `herdr-sidebar-evaluation`, `multiwindow-delegation`: введённые для оценки и внедрения агентских раннеров требования отменяются вместе с компонентами.

## Impact

`npm/package.json` и lock, `configs/settings.json`, `configs/APPEND_SYSTEM.md`, `manifest.json`, `install.sh`, `uninstall.sh`, `local-extensions/deferred-tools.ts`, скрипты `install-terminal-subagent.mjs`, `test-terminal-*`, `test-herdr-*`, `herdr-child-fixture.mjs`, `no-network-fake-herdr.cjs`, `evaluate-*`, python-тесты, `patches/pi-herdr-agents+3.3.1.patch`, `docs/portable-stack.md`, README и docs про Herdr-agents, а также перечисленные спеки.

Не входят: стандартный Herdr CLI/сервер, `stack/lock.json`, остальные пакеты и версии, авторизация, провайдеры, SSH-инструкции, личные данные и история сессий. Удаление агентских пакетов из живого профиля выполняется только в рамках согласованной установки с backup.
