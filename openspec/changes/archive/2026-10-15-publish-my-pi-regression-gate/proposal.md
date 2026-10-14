## Why

Пользователь подтвердил IliaFF/my_pi как основной репозиторий и сначала разрешил отдельную ветку, затем явно потребовал push сразу в main. Локальный initial Git baseline нельзя force-push поверх существующей истории; реальный CI пока не был запущен.

## What Changes

- Перенести проверенный baseline b7255a8 на ветку от origin/main 55bfb81, с последующим обычным fast-forward push в main; без переписывания истории.
- Сохранить существующий remote TODO и незатронутые Jev source files; убрать только заменённый RPIV patch 2.12.0.
- Запустить тот же mandatory gate локально и через реальный GitHub Actions.
- Сохранить evidence с remote commit/job URL; archive только после подтверждения CI.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

Нет: поведение уже описано в двух перенесённых archived changes. Это publication/integration change, archive --skip-specs.

## Impact

Git branch, GitHub Actions, OpenSpec evidence и README provenance. Production не меняется. Main обновляется обычным fast-forward по явному указанию пользователя; force-push запрещён.
