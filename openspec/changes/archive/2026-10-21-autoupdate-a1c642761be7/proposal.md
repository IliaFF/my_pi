# Proposal

## Why

Выбранные стабильные npm releases требуют выравнивания portable runtime: browser-use 0.1.29, pi-token-speed 0.12.0 и pi-web-access 0.43.0. Остальные 16 прямых pins уже совпадают с целями; новых возможностей сборки не добавляем.

## What Changes

- Обновить только три exact pins и runtime lock в npm/.
- Сохранить package membership, scripts, allowScripts, core/TUI 1.3.0 и все локальные контракты/патчи.
- Проверить неизменённым полным npm test; записать evidence и архивировать только после PASS.
- Подготовленный контроллером configs/settings.json не менять.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `build-validation`: уточнить сценарий exact candidate validation для выбранного набора без изменения требований существующих проверок.

## Impact

Только npm/package.json, npm/package-lock.json и текущий OpenSpec change; при необходимости документация совместимости. Protected tests/scripts/configs, существующие specs/history, root package files остаются неизменными. Deployment, push, commit, личные настройки, live provider/Chrome/SSH проверки вне scope. Авторизованный доступ: npm/GitHub read и Codex subscription; платные API keys не используются.
