# Диагностика и восстановление

## Источник и runtime — разные вещи

`pi-build/` — Git-источник: код, portable configs, exact locks, patches, OpenSpec, тесты. `~/.pi/agent/` — личный установленный runtime. `~/.pi/agent/maintenance` пока остаётся прежней копией: эта миграция **не устанавливает** новый baseline автоматически.

Baseline закрепляет фактически используемое ядро Pi **1.2.0** и pi-tui **1.2.0**. Версии остальных direct dependencies сверены с установленным runtime. Установленные SDK peers 1.0.0 заменены в source на согласованные 1.2.0; это не меняет production. Stock RPIV 2.13.8 провалил проверку first-turn UI availability; однострочный patch перенесён на 2.13.8 и проверяется fresh replay. У старого maintenance было ядро 1.0.0; его инструкции/API-проверки частично отстали от рабочего окружения.

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

- Production drift RPIV patch и loop-profiler обнаружен ранее; новой миграцией он не скрывается и не устраняется. Runtime с drift должен отклоняться update preflight.
- Mandatory gate проверяет real SDK + faux provider, real CLI startup, local patched packages, temporary filesystem. MCP transports отключены; API keys не передаются.
- Smoke guard блокирует Node fetch/http/net, но не является OS sandbox для native code/подпроцессов.
- Registry archive replay остаётся в отдельном `python3 scripts/test-release.py`; `npm test` проверяет fresh lock installation + application/reverse verification установленных патчей без повторного скачивания архивов.
- CI для IliaFF/my_pi подтверждён реальным passing job: https://github.com/IliaFF/my_pi/actions/runs/38652731907 (main SHA 1b9b4b3). Проверяйте conclusion именно для нужного SHA; прежний passing run не подтверждает последующие изменения.
