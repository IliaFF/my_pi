# Proposal

## Why

Старая неуспешная snapshot-подготовка до запуска shell оставляет обязательный unknown scope; complete повторно обходит его даже после успешной другой проверки. Выполненные задачи нельзя штатно вернуть из Blocked. Это воспроизводимые ошибки очереди из reports/queue-blockers-audit-20261021.md.

## What Changes

- Разрешить явный supersede только доказуемо не запущенной snapshot-попытки свежим успешным check, в том числе другого cwd, с обязательной причиной смены scope. Запущенные failed/unknown/running и нестабильные checks не получают это исключение.
- Fingerprint при complete брать только для последних конечных обязательств, не для заменённых scopes. Историю не удалять.
- Добавить явный reopen Blocked по id/reason при пустом In progress. Новый lifecycle обязан получить свежий recorded check; старые результаты остаются историей, не разрешением завершить задачу.
- Покрыть pure и actual SDK/background regressions; описать безопасное восстановление старых записей.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `task-selection`: безопасное восстановление Blocked и не запущенных snapshot attempts; сохранение guard для реально исполнявшихся проверок.
- `build-validation`: обязательное offline покрытие восстановления и substituted scopes.

## Impact

`local-extensions/todo-queue/{core,checks,index}.ts`, README, существующие queue unit/SDK тесты. Новых dependencies, изменений budget, production settings, deployment и публикации нет. Старые записи корневого TODO могут восстанавливаться только последовательными явными операциями проверенного source tool с новым evidence.
