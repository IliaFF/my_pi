# Proposal

## Why

Штатный rollback остановился до записи на обычной npm-ссылке `.bin/jiti -> ../jiti/lib/jiti-cli.mjs`: uninstall.sh отклоняет любой `..` в linkname, даже если ссылка остаётся внутри управляемого дерева. Это мешает восстановить исходный runtime после согласованной установки SSH-патча, которая заодно понизила 12 зависимостей до source lock.

## What Changes

- Разрешить внутренние относительные symlinks/hardlinks в installer backup, сохранив отказ на выход за разрешённые управляемые пути и специальные файлы.
- Полностью проверить и распаковать backup в приватный staging до удаления текущих управляемых файлов; не объявлять успешным отказавший или непроверенный restore.
- Использовать тот же путь восстановления из error trap install.sh вместо отдельного необработанного tar extract.
- Добавить failing regression с настоящим uninstall CLI и временным agent, затем adversarial cases и обязательный npm test. Обновить rollback-документацию и evidence.
- После PASS отдельно восстановить текущий пользовательский backup, проверить исходные версии/настройки и установить только проверенный SSH-патч без повторного выравнивания остальных dependencies. Эти production-действия уже согласованы пользователем, но не входят в offline tests.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `build-governance`: installer rollback принимает корректные внутренние ссылки, проверяет archive и назначения до записи и используется одинаково manual/automatic путями.
- `build-validation`: mandatory gate выполняет настоящий sandbox rollback с внутренними ссылками и проверяет безопасный отказ до изменения agent.

## Impact

- Код: uninstall.sh, error trap install.sh; без нового пакета, нового формата backup и изменения dependency versions.
- Проверки: новый небольшой assert-based rollback regression, scripts/test-build.py и при необходимости существующие installer fixtures.
- Документация: docs/diagnostics-and-rollback.md и artifacts этого change.
- Не входят: Canary, порог 500k, прогрев контекста, переписывание maintenance.py backup формата, произвольные внешние symlinks, новый механизм updater и hot reload текущего Pi.
