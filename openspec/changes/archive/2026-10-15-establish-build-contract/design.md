# Context

Maintenance находится вне проекта и Git. Есть точные npm locks, патчи, portable snapshots и разрозненные assert-based тесты. Активный runtime уже расходится с snapshots: ядро 1.2.0 вместо закреплённого 1.0.0, RPIV patch и loop-profiler. Чистый прогон подтвердил зависимость SDK-теста от нового event.messageType; snapshot policy обновлён, но его тест остался старым. В baseline закрепляем 1.2.0 и соответствующий pi-tui без изменения production. Read-only host gate обнаружил 12 version mismatches старого lock: остальные extensions фиксируем на реально установленных версиях, Stock RPIV 2.13.8 также провалил first-turn regression: сохраняем однострочную session_start reconciliation как versioned patch 2.13.8. See proposal.md — Why.

# Goals / Non-Goals

Источник истины — `pi-build`. Не переносить auth, sessions, SQLite, runtime node_modules или пользовательские конфиги. Не обновлять production и не публиковать репозиторий автоматически.

# Decisions

- Использовать существующие тесты и стандартные Node/Python средства; OpenSpec CLI закрепить отдельно от runtime dependencies.
- Готовить временный agent из portable snapshots; npm зависимости брать из точного lock в репозитории, не из HOME пользователя. В тестах model/auth заглушены; smoke не отправляет prompt.
- `npm test` проверяет OpenSpec, unit, SDK integration, patch application/verify и RPC startup. Все проверки имеют deadline; ненулевой результат блокирует переход к установке/обновлению.
- CI вызывает ту же команду; JSON-результат и логи сохраняются независимо от успеха.
- Безусловное удаление/перезапись production запрещено. Git восстанавливает source, существующий backup/uninstall — runtime. Недоступность сети для загрузки dependencies не объявлять поломкой модели.

# Risks / Trade-offs

- Offline проверки не доказывают работу внешних сервисов → отдельные согласованные live проверки.
- Существующий runtime drift → сообщить отдельно, не исправлять его под видом миграции.
- `--ignore-scripts` может выявить native dependency → обязательный runtime probe должен упасть, а не замолчать.
- CI workflow существует локально, но без remote/push невозможно доказать удалённый запуск.

# Migration Plan

1. Скопировать только release files, создать OpenSpec и Git.
2. Проверить чистую dependency installation и временную сборку.
3. После PASS сделать baseline commit и документировать rollback.
4. Production применять только отдельным явным действием. При поломке сохранить report, создать change с failing regression, восстановить согласованный known-good source/runtime.
