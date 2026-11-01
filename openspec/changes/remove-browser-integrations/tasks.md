# Tasks

## 1. Reconcile source

- [x] 1.1 Повторить fetch и merge origin/main с сохранением 591bf09/6d44d44; проверить ancestry, чистоту conflict markers и сохранение исходного unrelated diff по /root/.pi/pi-update-initial.ws07po.
- [x] 1.2 Согласовать install.sh и portable tests: exact-known-block AGENTS migration, --skip-stack, curl timeout 540; подтвердить regression tests для всех трёх контрактов.

## 2. Remove browser integrations from source

- [x] 2.1 До исправлений добавить failing regression в существующие portable/config/preservation/bootstrap tests: browser-free inventory, удаление string/object package entries и MCP chrome/jev-browser, сохранение private/SSH/paper-search, idempotence; сохранить точную причину FAIL.
- [x] 2.2 Удалить browser dependencies/config/provisioning/launchers, пересчитать согласованные locks без unrelated updates; обновить callers, fixture expectations, README и portable-stack docs; targeted tests должны стать PASS.
- [x] 2.3 Проверить все browser-related references в tracked active source, в том числе maintenance/release checks, web-access/preview hooks; сохранить не-браузерные функции и исторические rollback compatibility paths с пояснением. Подтвердить browser-free bootstrap test и отсутствие исполняемого browser provisioning.

## 3. Safe runtime migration

- [x] 3.1 Реализовать минимальный guarded cleanup/migration в существующем installer flow; добавить проверку symlink/ambiguous-target отказа до удаления, private-data preservation, backup и restore в fixture tests; документировать границы rollback включая stack payloads.
- [x] 3.2 Выполнить полный npm test, strict OpenSpec validation, shell/diff checks и review полного owned diff, включая новые файлы; записать commands, versions, scope и результаты до production изменений.
- [x] 3.3 Инвентаризировать личный runtime, удаляемые payloads/объём/free space и private config hashes без публикации credentials; создать и проверить приватный backup installer/core и дополнение для stack cleanup. Артефакт evidence должен содержать пути backup и подтверждение покрытия.
- [x] 3.4 Установить проверенный source с --preserve-settings --install-core --skip-stack и выполнить согласованную scoped очистку browser components; проверить отсутствие browser integrations и сохранность unrelated config/credentials/Firstmate/paper-search, не удалять system browser/personal data/shared caches.
- [x] 3.5 Выполнить offline host/SDK/RPC gates на финальном установленном scope; проверить CLI/core versions и maintenance drift, сохранить результаты и ограничения, сообщить о необходимости restart. При отказе подтвердить restore, не продолжать вслепую.

## 4. Evidence and delivery

- [x] 4.1 Записать итоговые source/host checks, revision, versions, backup/rollback и непроверенные CI/live аспекты в evidence; проверить весь финальный owned diff против initial state и актуальность успешных checks.
- [ ] 4.2 Commit source/specs/tests/evidence и только owned TODO task change; исключить чужой TODO diff, .pi/tasks, Canary, logs и credentials. Push origin/main без force и проверить совпадение remote HEAD и ancestry сохранённых локальных commits.

## Workflow follow-up

- Sync/archive change только после PASS и завершения всех tracked tasks; не архивировать незавершённый deployment и не потерять отдельный fix-queue-context-isolation change.
