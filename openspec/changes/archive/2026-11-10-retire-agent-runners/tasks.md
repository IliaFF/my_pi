## 1. Contracts

- [x] 1.1 Записать исходное состояние рабочего дерева pi-build и решение оператора; переписать change предложением, design и spec-дельтами.
- [x] 1.2 Добавить офлайн-проверку отсутствия агентских раннеров и подтвердить её падение на текущем source (RED).

## 2. Removal

- [x] 2.1 Удалить пакеты pi-subagents/pi-herdr-agents из npm-манифеста и lock, агентские конфиги, снимки манифеста, патч и локальное расширение herdr-agent-state.
- [x] 2.2 Убрать агентские ветки install/uninstall и terminal-installer; обновить managed-списки и сохранение настроек.
- [x] 2.3 Заменить разделы делегирования и terminal-workflow в APPEND_SYSTEM на правило «делегирование отключено»; почистить deferred-tools от агентских имён.
- [x] 2.4 Удалить retired скрипты, тесты, docs и убедиться, что gate не запускает retired адаптеры (GREEN).

## 3. Validation and delivery

- [x] 3.1 Прогнать targeted проверки и полный `npm test`, strict `openspec validate`; устранять причины, а не ослаблять проверки.
- [x] 3.2 Записать evidence, заархивировать change, проверить весь owned diff и отсутствие изменений в неуправляемых файлах.
- [x] 3.3 Commit source/specs/tests/evidence; retired правка заменена, а не откатана отдельным коммитом.
- [x] 3.4 Backup, установить обновлённую сборку в живой профиль, выполнить `npm test --agent`/`maintenance verify`; сообщить о необходимости перезапуска Pi.
- [x] 3.5 Push `origin/main` без force и подтвердить совпадение remote HEAD и ancestry.
