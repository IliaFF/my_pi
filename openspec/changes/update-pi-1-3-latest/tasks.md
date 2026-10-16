# Tasks

## 1. Exact candidate

- [x] 1.1 Зафиксировать Git revision, начальный diff, версии Node/core/runtime и npm stable latest всех существующих direct dependencies; сохранить таблицу в change и подтвердить отсутствие новых packages.
- [x] 1.2 Согласованно обновить exact npm lock, manifest, core/pi-tui/SDK peers, installer и документы версий; проверить reproducible npm ci в isolated agent и version coherence.

## 2. Compatibility

- [x] 2.1 Проверить upstream diff каждого затронутого patch package; при несовместимости записать failing regression до исправления, перенести минимальные patches/callers/tests и проверить application/reverse replay.
- [x] 2.2 Выполнить полный npm test с настоящим SDK, faux provider и CLI startup без credentials; записать статусы, версии и причины отказа в change.
- [x] 2.3 Проверить isolated preserve-settings installation и полный release replay через scripts/test-release.py; записать PASS либо остановиться до production.

## 3. Approved deployment

- [x] 3.1 Подготовить отдельные recovery backups global core и runtime, записать пути и проверить содержимое/возможность восстановления; credentials и sessions не изменять.
- [x] 3.2 Установить candidate через install.sh --preserve-settings --install-core; подтвердить сохранность private configs вне разрешённых version pins.
- [x] 3.3 Выполнить npm test -- --agent ~/.pi/agent и maintenance verify; при FAIL восстановить оба backup и повторить host gate, записать точный результат.

## 4. Acceptance evidence

- [x] 4.1 Просмотреть полный owned diff и новые файлы относительно начального состояния, сохранить посторонние изменения TODO.md, выполнить git diff --check и strict OpenSpec validation.
- [x] 4.2 Записать окончательные версии, backup paths, gate evidence и ограничения в change; явно отметить непроверенные CI/live services и необходимость restart.

## Workflow follow-up

- Архивировать change только после PASS всех необходимых проверок и завершения tracked tasks.
