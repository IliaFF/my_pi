# Диагностика и восстановление

## Сессии задач

`start_task_session` переносит независимую задачу в новую native-сессию; старый session file сохраняется и доступен через `/resume`. Связь определяется общей целью, не каталогом. При сомнении агент должен спросить; первая задача чистой сессии остаётся на месте. Это решение модели, не доказанная семантическая классификация. Переход не переносит старую переписку/результаты проверок и не завершает/освобождает TODO автоматически. Если есть незавершённая TODO или ожидающие сообщения, сначала явно решить их судьбу. Не обходить отказ запуском новой задачи в старой сессии. Внутренняя команда `task-session-handoff` требует одноразовый token от инструмента и не предназначена для ручного запуска.

## Источник и runtime — разные вещи

`pi-build/` — Git-источник: код, portable configs, exact locks, patches, OpenSpec, тесты. `~/.pi/agent/` — личный установленный runtime. `~/.pi/agent/maintenance` — установленная копия исходников. Source не устанавливается автоматически; в change align-latest-stable-runtime пользователь отдельно разрешил установку latest stable с backup и сохранением личных настроек.

Baseline закрепляет ядро Pi и pi-tui **1.4.0**. Direct extension pins и version-gated patches находятся в `npm/package.json` и `manifest.json`. Обновление stable stack описано в change `update-stack-1-4-0`; результаты source/host gates и установки записываются в его evidence. Номер SDK в dependencies сам по себе не подтверждает версию CLI из PATH: проверяйте оба entry point.

## При поломке

1. Не запускать `pi update` повторно и не стирать session/cache до выяснения причины.
2. В source выполнить `git status --short`, `git log -5 --oneline`, `npm test`. Посмотреть `test-results/results.json` и лог упавшего этапа. `npm test -- --agent ~/.pi/agent` отдельно проверяет фактические зависимости и drift runtime; не исправляет и не накатывает патчи на него.
3. Результат привязать к Git revision, Node/core/package versions, последнему known-good состоянию и изменившемуся contract. Не коммитить личные логи/ключи. Отсутствие dependency — setup error, timeout — отдельная ошибка; не выдавать их за поломку провайдера.
4. Создать OpenSpec change, воспроизвести failing regression, исправить root cause, пройти полный gate. Внешние live проверки не входят в обязательный offline gate.

## Вернуть источник

Сначала сохранить незакоммиченные изменения. Безопасное сравнение: `git diff <known-good> -- <paths>`. Для исправления предпочтителен `git revert <bad-commit>` — сохраняет историю; не выполнять `git reset --hard` автоматически. После revert обязательны `npm ci --ignore-scripts`, `npm ci --ignore-scripts --legacy-peer-deps --prefix npm`, `npm test`.

Git откатывает source, **не установленный runtime**. Не делать переустановку, пока не выбран known-good commit и не получен PASS.

## Вернуть runtime

Перед явной установкой installer сохраняет backup и сообщает путь. `uninstall.sh` принимает созданный installer backup: прочитать `./uninstall.sh --help` и проверить принадлежность agent directory. Путь последнего install backup хранится локально в `~/.pi/agent/.my-pi-last-backup`.

Maintenance update имеет другой формат backup (`backup-manifest.json`, hashes и npm-tree archive):

```bash
PI_CODING_AGENT_DIR="$HOME/.pi/agent" python3 scripts/maintenance.py restore-backup /absolute/path/to/approved-backup
npm test -- --agent "$HOME/.pi/agent"
```

Не смешивать форматы. Restore проверяет допустимые назначения и hashes до записи. Если проверки после восстановления не проходят, откат **не подтверждён**; сохранить локальные результаты, не продолжать обновления. После успешного восстановления нужен перезапуск Pi.

## Известные границы

- Ранее обнаруженный drift RPIV patch и loop-profiler устранён согласованной latest-stable установкой. Host gate PASS; verify failures=0, warnings=3 относятся к сохранённым личным settings/mcp/APPEND (audit-only). Текущий процесс требует restart; не считать обновление файлов hot reload.
- Для существующего runtime используйте install.sh --preserve-settings --install-core; bare install применяет default settings.
- OpenSpec1.14.3 tooling audit: 0 vulnerabilities при обновлении 2026-10-19; это результат проверки текущего dependency tree, не гарантия отсутствия будущих advisories. Не применять audit fix --force без отдельной проверки совместимости.
- Mandatory gate проверяет real SDK + faux provider, real CLI startup, local patched packages, temporary filesystem. MCP transports отключены; API keys не передаются.
- Smoke guard блокирует Node fetch/http/net, но не является OS sandbox для native code/подпроцессов.
- Registry archive replay остаётся в отдельном `python3 scripts/test-release.py`; `npm test` проверяет fresh lock installation + application/reverse verification установленных патчей без повторного скачивания архивов.
- CI для IliaFF/my_pi подтверждён реальным passing job: https://github.com/IliaFF/my_pi/actions/runs/38652731907 (main SHA 1b9b4b3). Проверяйте conclusion именно для нужного SHA; прежний passing run не подтверждает последующие изменения.

## Штатное обновление не сохраняет патчи

`pi update --extensions` заменяет package files, но не запускает наш patch/gate/rollback. После такого обновления сначала read-only диагностика; не запускать apply на неизвестную версию. Ponytail может отдельно загружаться из project `.pi/npm`: исправление только user package недостаточно. Project patch требует отдельного backup, сверки version и actual SDK gate. Safe updater проверяет user runtime, поэтому запускайте его из HOME, а не из проекта с собственными npm packages; успешный user gate не подтверждает project override. Историческая оценка subagents на SDK1.2.0 не переносится на новую baseline автоматически.
