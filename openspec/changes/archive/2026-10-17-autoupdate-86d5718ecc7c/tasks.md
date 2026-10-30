## 1. Candidate

- [x] Прочитать применимые specs и создать change до правок.
- [x] Синхронизировать exact runtime pins/lock без изменения package names и allowScripts.
- [x] Запустить неизменённый regression gate перед адаптацией patches.

## 2. Compatibility

- [x] Проверить upstream и перенести только необходимые versioned patches/metadata.
- [x] Выполнить pristine registry patch replay и полный npm test PASS.

## 3. Evidence

- [x] Проверить source changes и неизменность protected paths; отсутствие Git diff явно отметить для контроллера.
- [x] Записать версии, результаты, audit/CI/live ограничения и разрешить архивирование после PASS.
