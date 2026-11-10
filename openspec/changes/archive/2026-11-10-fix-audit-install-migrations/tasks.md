# Tasks

## 1. Regression
- [x] 1.1 Добавить и выполнить RED: linked APPEND/parents, private snapshot, известные retired файлы и APPEND sections, unknown refusal, backup/rollback, сохранение личных siblings и idempotence.
- [x] 1.2 Зафиксировать исходные сценарии и ограничения без личного runtime.

## 2. Implementation
- [x] 2.1 Добавить минимальную безопасную migration helper/data; подключить preflight до изменений и apply после backup, расширить точные backup/restore наборы.
- [x] 2.2 Защитить APPEND snapshot, убрать stale settings, согласовать policy spec без возвращения абзаца.
- [x] 2.3 Обновить существующие callers/tests/docs, сохраняя все прежние проверки.

## 3. Acceptance
- [x] 3.1 GREEN focused regressions и полный npm test (14/14 regressions; 28/28 gate).
- [x] 3.2 Strict OpenSpec, полный owned diff с untracked файлами, проверка сохранения исходного чужого untracked.
- [x] 3.3 Evidence с командами/exit codes/ограничениями и reviewed deltas подготовлены к archive/commit; без production и push.

После архивирования: повторный полный gate архивированного scope и commit source/spec/tests обязательны для завершения корневой TODO-задачи ff5f396afc3d. Фактический результат последнего gate фиксируется в commit message и корневом TODO; до PASS задача остаётся In progress.
