# Диагностика и восстановление

## Источник и runtime — разные вещи

`pi-build/` — Git-источник: код, portable configs, exact locks, patches, OpenSpec, тесты. `~/.pi/agent/` — личный установленный runtime. `~/.pi/agent/maintenance` — установленная копия исходников. Source не устанавливается автоматически; в change align-latest-stable-runtime пользователь отдельно разрешил установку latest stable с backup и сохранением личных настроек.

Baseline закрепляет фактически используемое ядро Pi **1.3.0** и pi-tui **1.3.0**. Ponytail5.3.0/Preview0.23.0 имеют перенесённые патчи; retry0.11.1, fast-resume1.4.17 и web-access0.41.0 выровнены с обновлённым runtime. Остальные direct версии сохранены. SDK peers были1.2.0; после согласованного исправления они выровнены с core1.3.0 и в source, и на диске runtime. Stock RPIV 2.13.8 провалил проверку first-turn UI availability; однострочный patch перенесён на 2.13.8 и проверяется fresh replay. У старого maintenance было ядро 1.0.0; его инструкции/API-проверки частично отстали от рабочего окружения.

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
- OpenSpec1.14.1 tooling audit сохраняет4 high в transitive glob dependencies; runtime audit0. Не применять audit fix --force: предложен несовместимый downgrade OpenSpec.
- Mandatory gate проверяет real SDK + faux provider, real CLI startup, local patched packages, temporary filesystem. MCP transports отключены; API keys не передаются.
- Smoke guard блокирует Node fetch/http/net, но не является OS sandbox для native code/подпроцессов.
- Registry archive replay остаётся в отдельном `python3 scripts/test-release.py`; `npm test` проверяет fresh lock installation + application/reverse verification установленных патчей без повторного скачивания архивов.
- CI для IliaFF/my_pi подтверждён реальным passing job: https://github.com/IliaFF/my_pi/actions/runs/38652731907 (main SHA 1b9b4b3). Проверяйте conclusion именно для нужного SHA; прежний passing run не подтверждает последующие изменения.

## Штатное обновление не сохраняет патчи

`pi update --extensions` заменяет package files, но не запускает наш patch/gate/rollback. После такого обновления сначала read-only диагностика; не запускать apply на неизвестную версию. Ponytail может отдельно загружаться из project `.pi/npm`: исправление только user package недостаточно. Project patch требует отдельного backup, сверки version и actual SDK gate. Safe updater проверяет user runtime, поэтому запускайте его из HOME, а не из проекта с собственными npm packages; успешный user gate не подтверждает project override. Историческая оценка subagents на SDK1.2.0 не переносится на новую baseline автоматически.
