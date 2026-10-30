# Proposal

## Why

Обновить portable сборку до разрешённых exact npm targets без новых возможностей и без потери локальных контрактов. Изменились пять релизов расширений; версия core/TUI остаётся 1.4.0.

## What Changes

- Обновить только существующие exact pins и runtime lock.
- Перенести локальные патчи Ponytail, Markdown Preview и Web Access на новые версии, сохранив поведение.
- Проверить полный неизменённый offline gate; сохранить evidence и архивировать только после PASS.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `build-validation`: уточнить exact candidate baseline для данного обновления, сохраняя все существующие проверки.

## Impact

`npm/package.json`, `npm/package-lock.json`, versioned patches и manifest patch metadata. Подготовленный `configs/settings.json` неизменяем. Tests, scripts, root package files, managed configuration membership и прежние OpenSpec specs/history не изменяются. Deployment, push, live providers и private runtime вне scope.
