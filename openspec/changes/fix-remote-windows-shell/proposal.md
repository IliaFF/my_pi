# Proposal

## Why

SSH-доступ к Windows работает, но pi-ssh-remote 0.1.15 безусловно запускает `timeout … bash -lc`, а при подключении — `cd -- … && pwd -P`. На Windows с cmd.exe это блокирует connect и exec, хотя транспорт и авторизация исправны.

## What Changes

- Различать POSIX и Windows cmd.exe до использования shell-зависимой обёртки; не менять настройки удалённой ОС.
- Обеспечить Windows connect/reconnect, определение cwd, chdir и exec через tool и slash command без Unix-команд.
- Сохранить POSIX remote timeout и добавить ограниченный локальный deadline для Windows SSH-каналов; не обещать уничтожение удалённого процесса после закрытия канала.
- Не направлять стандартные файловые/bash-инструменты на Windows через заведомо POSIX-реализации: до полной поддержки оставить их локальными с явным предупреждением.
- Сначала воспроизвести ошибку тестом, затем проверить реальный patched package через Pi SDK и локальный SSH fixture.

## Capabilities

### New Capabilities
- `remote-shell-execution`: выбор shell, cwd, исполнение и ограничения Windows remote-соединения.

### Modified Capabilities
Нет. Существующие build-validation и build-governance применяются без изменения требований.

## Impact

Источник исправления — `patches/pi-ssh-remote+0.1.15.patch`, не установленный runtime. Затронуты package index.ts, shared shell helpers при необходимости, tool/slash callers, remote state/reconnect, routing guards, regression script и `scripts/test-build.py`, документация ограничений. Версии dependencies менять не требуется.

Вне scope: поддержка произвольного ProxyCommand/IdentitiesOnly в парсере, ControlMaster, полноценные Windows read/write/edit/bash adapters, PowerShell как отдельный профиль, настройки sshd/Windows, копирование ключей, установка в личный runtime. Live-проверка Windows и установка — отдельные согласованные шаги; offline fixture не доказывает работоспособность реального Windows-хоста.
