## Why
Аварийные recovery packets дублируют журнал, индекс context-fold и TODO, а эвристики принимают строки документации и `0 failed` за решения/блокеры. Ошибка записи packet блокирует полезное автосжатие. Пользователь согласовал удаление и аудит старых сессий, а также push сборки.

## What Changes
- Удалить запись packets, парсер recovery markers, неиспользуемую проекцию состояния, packet-only настройки и диагностику.
- Сохранить threshold 170k, 12k retention, compactability, единственного deterministic summary owner, lifecycle continuation и clear-context.
- Сохранить короткое task-conditional TODO restoration reminder без packet; убрать мёртвые marker инструкции из APPEND.
- Добавить failing regression, обновить SDK/contract tests и README.
- Проанализировать локальные старые сессии около compaction; опубликовать только обезличенные выводы без transcript/секретов.

## Capabilities
### Modified Capabilities
- `compaction-reliability`: автосжатие не зависит от аварийного файлового snapshot.
- `general-agent-policy`: restoration без packets/marker protocol.

## Impact
local extension, APPEND, README, существующие tests. Без новых dependencies, изменения context-fold, настроек порогов, удаления старых packets или установки runtime. Push в существующий remote разрешён пользователем; live provider calls не нужны.
