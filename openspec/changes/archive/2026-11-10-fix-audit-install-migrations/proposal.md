# Proposal

## Why
Аудит 713b859 воспроизвёл потерю retired конфигов после успешного rollback, запись через APPEND symlink, импорт личного APPEND в source и неполную миграцию старых профилей. Пользователь согласовал исправление всех семи замечаний без production-установки.

## What Changes
- Отказывать на linked APPEND/его родителях и неоднозначных retired файлах до изменений профиля.
- Сохранять все изменяемые retired файлы в installer backup; восстанавливать их настоящим uninstall CLI, сохраняя исторические наборы.
- После backup удалять только точно известные поставлявшиеся retired файлы и блоки terminal/delegation; личный текст и соседние файлы сохранять.
- Удалять retired settings.subagents вместе с package registrations; убрать неиспользуемые default readseek/thresholds/cooldownMs.
- Запретить runtime snapshot APPEND, сохранив portable baseline.
- Удалить остаточное требование повторного разрешения агентов: пользователь подтвердил, что APPEND остаётся без делегационного абзаца.

## Capabilities
### New Capabilities
Нет.

### Modified Capabilities
- `build-governance`: backup, preflight и адресная миграция известного legacy при сохранении личной конфигурации.
- `portable-user-stack`: source-only APPEND и полное удаление известных retired остатков из обновляемого профиля.
- `build-validation`: регрессии реальной миграции/rollback, linked destinations и privacy snapshot.
- `general-agent-policy`: убрать противоречащее выбранной политике остаточное требование агентского запрета.

## Impact
install.sh, uninstall.sh, bounded Node migration helper и список известных historical hashes/sections, manifest/configs, installer tests, docs/specs. Без обновления packages, production, SSH, сети/моделей или новых зависимостей. Проверки не ослабляются; полный npm test и strict OpenSpec обязательны.
