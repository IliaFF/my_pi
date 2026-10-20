# Proposal

## Why

Контроллер выбрал точные npm targets для планового обновления. Baseline уже совпадает с 18 targets; pine-of-glass 0.18.0 необходимо заменить на 0.18.1, сохранив локальные контракты.

## What Changes

- Обновить только точный pin pine-of-glass и runtime lock.
- Проверить неизменённым полным npm test все локальные patches, SDK и startup.
- Сохранить evidence и spec delta в архиве без записи в защищённые основные specs.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `build-validation`: уточнить сценарий проверки данного набора точных targets; существующие требования gate остаются обязательными.

## Impact

Изменяются npm/package.json и npm/package-lock.json. Core/TUI 1.3.0, installer, patches, extensions, managed configs, scripts, allowScripts и состав зависимостей остаются прежними. Новые features, deployment, push, provider requests и личные runtime данные вне scope. Подготовленный контроллером configs/settings.json не изменяется.
