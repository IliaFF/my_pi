# Proposal

## Why

Требуется синхронизировать portable сборку с точными утверждёнными npm targets, сохранив локальные контракты. Обновляются browser-use, Preview и Web Access; остальные прямые зависимости уже соответствуют targets.

## What Changes

- Обновить только точные pins и соответствующий lock в npm/.
- Перенести существующие патчи Preview и Web Access на новые версии, сохранив deferred exposure и lifecycle loader.
- Проверить полный неизменённый npm test и записать evidence до архивации.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `deferred-tool-loading`: уточнить проверяемый baseline Preview до 0.26.2 без изменения инструмента.

## Impact

npm/package.json, npm/package-lock.json, versioned patches и patch metadata manifest.json. Core/TUI остаются 1.4.0. Подготовленный configs/settings.json и все protected файлы неизменны. Новые возможности, paid API, deployment, Git commit/push и live проверки исключены.
