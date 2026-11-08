## Why

Измеренный A/B показывает, что автоматический Jev/DeepSeek-контур не улучшает поведение, а ухудшает его: на задаче с загрузкой Python-стайлгайда перед правкой кода плечо без расширения дало 4/4 успеха, плечо с ним — 0/4 (те же промпты, те же скиллы, та же модель `deepseek-v4.1-flash-1017`, отличие только в наличии `extensions/jev-review`; отчёт `reports/new-pi-ab-jev-20261108.md` во внешнем репозитории). На задачах «найти настоящий манифест» и «ревью с внедрённым дефектом» разницы нет.

Отдельный подтверждённый дефект: расширение правит головное system-сообщение на каждом запросе (`context_with_system`, `index === firstSystem`) и подставляет туда результат гидратации, зависящий от текущего промпта. Префикс промпта меняется каждый ход, поэтому провайдерский prompt cache инвалидируется целиком: `pi-cachemire` классифицирует это как `history rewritten at message 1 of N` и переписывает ~90% промпта заново. Pi сам для этого случая добавляет изменённые секции отдельным сообщением в хвост, то есть расширение обходит кэш-безопасный механизм ядра.

Пользователь потребовал откатить контур.

## What Changes

- Удалить `local-extensions/jev-review` из сборки: `index.ts`, `workflow.ts`, `privacy.ts`, `README.md`, `check.mjs`, `sdk-check.mjs`.
- Убрать установку расширения из `install.sh`: запись `extensions/jev-review` в `managed` и копирование файлов.
- Убрать три записи `extensions/jev-review/*` из `manifest.json`.
- Убрать два обязательных этапа `npm test`, запускавших его собственные проверки, из `scripts/test-build.py`; заменить контрактные assertion в `scripts/test-portable-stack.mjs` на «контур отсутствует в сборке».
- Оставить `extensions/jev-review` в allowlist `uninstall.sh` как исторический путь: бэкапы, содержащие расширение, должны оставаться восстанавливаемыми (тот же подход, что для legacy `bin/jev-browser`).
- Удалить capability `deepseek-workflow-assistance` и связанные требования `portable-user-stack` / `build-validation`.

Вне scope: любые другие расширения, `todo-queue`, промпт-файлы `AGENTS.md`/`APPEND_SYSTEM.md`, установка в production и публикация репозитория.

## Capabilities

### Removed Capabilities
- `deepseek-workflow-assistance`: модель-специфичная гидратация скиллов, retrieval, codemode-подсказки, отзывы классификатора и приватная диагностика удаляются вместе с расширением.

### Modified Capabilities
- `portable-user-stack`: managed inventory больше не содержит workflow-расширение; исторические бэкапы с ним остаются восстанавливаемыми.
- `build-validation`: обязательный gate больше не требует offline-проверок удалённого расширения.

## Impact

Source scope: `local-extensions/jev-review` (удаление), `install.sh`, `uninstall.sh` (комментарий), `manifest.json`, `scripts/test-build.py`, `scripts/test-portable-stack.mjs`, спеки. Личный runtime уже приведён в согласованное состояние отдельным действием: каталог расширения и его логи перемещены в `~/.pi/my-pi-backups/jev-review-removed-20261108T173437Z`; этот change описывает только исходники сборки. Никаких платных запросов, изменений credentials, SSH или production-файлов change не требует.
