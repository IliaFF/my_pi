# Proposal

## Why

Пользователь явно отказался от всех браузерных интеграций Pi. Сейчас source и личный runtime содержат pi-browser-use, Chrome MCP и Jev/Playwright; preserve-settings оставляет старые browser entries, а portable bootstrap продолжает устанавливать браузерный стек.

## What Changes

- **BREAKING**: удалить pi-browser-use, Chrome/jev-browser MCP, их зависимости, настройки и managed browser launchers из активного source и установленного личного Pi.
- Убрать browser provisioning из portable bootstrap; сохранить Firstmate, Herdr, paper-search, SSH и остальные возможности.
- Предусмотреть явную безопасную миграцию существующего runtime после проверенного backup: удалить только согласованные browser components, не системный браузер, личные профили/данные или общие кэши.
- Объединить main с origin/main, сохранив локальные commits 591bf09 и 6d44d44, exact-known-block AGENTS migration, upstream --skip-stack и artifact timeout 540.
- Выполнить failing regression, полный npm test, backup/install, offline host gate, evidence, commit и push origin/main. Установка разрешена запросом, live model calls запрещены.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `portable-user-stack`: browser-free inventory и scoped удаление устаревших browser integrations с сохранением unrelated runtime.

## Impact

npm manifests/locks, configs/settings.json и mcp.json, stack npm manifests/locks и identity, scripts/install-stack.mjs, install.sh, сохранение настроек и backup/rollback, callers в maintenance, portable/bootstrap/release/preservation tests, README и docs/portable-stack.md. Исторические specs/changes и старые backup allowlists сохраняют историю, но не включают интеграции в новый release.

Личный runtime не импортируется в Git. Исходные чужие TODO изменения, .pi/tasks и Canary change остаются вне commit. Source snapshot: /root/.pi/pi-update-initial.ws07po. Пользователь дополнительно выбрал оставить pi-markdown-preview и pi-web-access без изменений, включая встроенные опциональные browser-функции. Не входят: обновление остальных версий, системные browsers, personal profiles, shared caches, credentials, live MCP/model проверки, настройка SSH/служб или дополнительное развёртывание стека ради тестов.
