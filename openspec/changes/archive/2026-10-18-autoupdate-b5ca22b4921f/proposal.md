# Proposal

## Why

Контроллер выбрал pine-of-glass 0.18.0; исходный exact pin/lock ещё содержит 0.17.0. Нужно выровнять release без новых функций и подтвердить сохранение существующих контрактов неизменённым offline gate.

## What Changes

- Обновить только существующий npm pin pine-of-glass до 0.18.0 и соответствующий lock.
- Сохранить остальные 18 exact targets, allowScripts, scripts, managed configs, patches и local extensions.
- Уточнить проверяемый release scenario в delta и записать evidence; обновить устаревшие версии в README.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `build-validation`: конкретизировать существующий exact-candidate release scenario для выбранного observability update; требования gate не ослабляются.

## Impact

Затронуты npm/package.json, npm/package-lock.json, README и новый OpenSpec change. Core/TUI 1.3.0, installer и manifest уже согласованы с targets и не требуют изменения. Подготовленный configs/settings.json остаётся byte-identical. Tests, scripts, configs, CI, root package files, существующие specs/history защищены. Deployment, Git commits/push, provider calls и личный runtime вне scope. Если требуется защищённая правка, работа останавливается.
