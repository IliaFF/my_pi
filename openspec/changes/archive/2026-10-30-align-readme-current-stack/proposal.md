## Why
README содержит устаревшие версии Chrome dependency и observability, прежнее описание Herdr plugin и неполное правило handoff. Локальное имя каталога и исторические CI/runtime сведения выглядят как текущие универсальные инструкции.

## What Changes
Согласовать только README с существующими pins и portable stack: версии, Herdr/Firstmate, исключение handoff, checkout directory и исторический статус evidence.

## Capabilities
### New Capabilities
Нет.
### Modified Capabilities
Нет: runtime и требования не меняются; docs-only, skip_specs: true.

## Impact
Только README и документы этого change. Без изменения callers, тестов, fixtures, exports, конфигов и runtime. Публикация README с этими документами позже отдельно согласована пользователем. Используется существующий npm test; новый тестовый механизм не создаётся.
