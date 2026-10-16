# Proposal

## Why

Пользователь запросил обновление установленного Pi и расширений до latest и разрешил предварительную подготовку сборки. npm registry сообщает Pi 1.3.0, тогда как source и активный runtime закреплены на 1.2.0; прямое обновление обойдёт проверку семи локальных патчей.

## What Changes

- Зафиксировать Pi core/pi-tui и существующие прямые зависимости на проверенных stable latest версиях; сохранить состав расширений.
- Перенести только необходимые локальные патчи на выбранные версии и согласованно обновить callers, tests, manifest, lock, installer и документацию.
- Проверить новую сборку изолированно, затем выполнить согласованную установку с backup и сохранением личных настроек.
- Зафиксировать точные результаты и ограничения; CI и внешние сервисы не считать проверенными без реальных запусков.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `build-validation`: при принятии latest release проверять согласованность core, SDK peers и exact runtime lock до установки и после неё.

## Impact

`npm/package.json`, `npm/package-lock.json`, `manifest.json`, `patches/`, `install.sh`, затронутые SDK callers/tests и документация версий. Production: глобальный npm Pi и `~/.pi/agent` только после PASS, с отдельным backup прежнего global core и runtime. Credentials, sessions, состав расширений и сторонние изменения TODO.md вне scope. Новые зависимости и функции не добавляются.
