# Диагностика и восстановление

## Источник и runtime — разные вещи

`pi-build/` — Git-источник: код, portable configs, exact locks, patches, OpenSpec, тесты. `~/.pi/agent/` — личный установленный runtime. `~/.pi/agent/maintenance` — установленная копия исходников. Source не устанавливается автоматически; в change align-latest-stable-runtime пользователь отдельно разрешил установку latest stable с backup и сохранением личных настроек.

Baseline закрепляет установленное ядро Pi **1.3.0** и pi-tui **1.3.0**. Все 19 direct dependencies сверены с npm stable latest и установленным runtime; SDK peers согласованы с core. Семь локальных патчей прошли pristine registry replay и host gate. Обновление описано в change `update-pi-1-3-latest`; private configs сохранены, settings изменены только в managed npm pins. Backup global core/runtime/source: `/root/.pi/my-pi-backups/pre-1.3.0.DohhJX`; installer backup: `/root/.pi/my-pi-backups/20261016T000908Z.z2abnh`.

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

Manual и automatic installer rollback используют один `uninstall.sh`. Он полностью распаковывает archive в приватный staging, проверяет разрешённые managed пути/типы и ссылки до удаления текущих файлов. Обычные внутренние npm-ссылки с `..` допустимы; выход за agent или managed scope, опасные destination parents, missing/corrupt payload отклоняются до замены. Staging требует дополнительного места. После копирования проверяются bytes, link targets и executable bits; исходный backup сохраняется. Замена нескольких директорий не является общей атомарной транзакцией: при ошибке копирования восстановление не подтверждено, нужно остановиться и проверить состояние.

Installer backup — state.json и agent-files.tar.gz; legacy state не содержит криптографической подписи или hashes каждого payload. Безопасная распаковка не доказывает происхождение backup. Не смешивать её с hash-проверками maintenance backup ниже. Перед полным installer сравните source lock с личными версиями: preserve-settings сохраняет private config, но managed npm pins всё равно выравниваются, включая понижения. Для отдельно согласованного patch-only deployment нельзя заодно менять остальные версии.

Maintenance update имеет другой формат backup (`backup-manifest.json`, hashes и npm-tree archive):

```bash
PI_CODING_AGENT_DIR="$HOME/.pi/agent" python3 scripts/maintenance.py restore-backup /absolute/path/to/approved-backup
npm test -- --agent "$HOME/.pi/agent"
```

Не смешивать форматы. Restore проверяет допустимые назначения и hashes до записи. Если проверки после восстановления не проходят, откат **не подтверждён**; сохранить локальные результаты, не продолжать обновления. После успешного восстановления нужен перезапуск Pi.

## Известные границы

- Обновление до 1.3.0: host gate 16/16 PASS; verify failures=0, warnings=2 относятся к сохранённым личным settings/mcp (audit-only). Auth, models и личные инструкции сохранены. Текущий процесс требует restart; не считать обновление файлов hot reload.
- Для существующего runtime используйте install.sh --preserve-settings --install-core; bare install применяет default settings.
- OpenSpec1.14.1 tooling audit сохраняет4 high в transitive glob dependencies; runtime audit0. Не применять audit fix --force: предложен несовместимый downgrade OpenSpec.
- Mandatory gate проверяет real SDK + faux provider, real CLI startup, local patched packages, temporary filesystem. MCP transports отключены; API keys не передаются.
- Smoke guard блокирует Node fetch/http/net, но не является OS sandbox для native code/подпроцессов.
- Registry archive replay остаётся в отдельном `python3 scripts/test-release.py`; `npm test` проверяет fresh lock installation + application/reverse verification установленных патчей без повторного скачивания архивов.
- CI для IliaFF/my_pi подтверждён реальным passing job: https://github.com/IliaFF/my_pi/actions/runs/38652731907 (main SHA 1b9b4b3). Проверяйте conclusion именно для нужного SHA; прежний passing run не подтверждает последующие изменения.
