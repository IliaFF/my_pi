## Why

Обновить утверждённый exact npm baseline без новых возможностей и без потери локальных контрактов. Подготовленный configs/settings.json уже синхронизирован контроллером и не меняется.

## What Changes

- Обновить только существующие runtime pins и lock до заданных версий.
- Проверить и перенести versioned patches Ponytail и ask-user-question на новые версии, сохранив требуемое поведение.
- Зафиксировать offline gate и registry replay evidence; не менять protected tests/scripts/configs, root package files или существующие specs/history.

## Capabilities

### New Capabilities

### Modified Capabilities
- `build-validation`: exact candidate baseline проходит существующий полный offline gate.

## Impact

Затронуты npm/package.json, npm/package-lock.json, patch metadata и при необходимости versioned patches. Core/TUI остаются 1.3.0. Managed configs и lifecycle allowScripts не меняются. Deployment, Git commits/push, личный runtime, live integrations и paid API вне scope.
