## Context
Pi выполняет hard compaction, context-fold предоставляет deterministic index. auto-ultra-compact должен лишь запускать compact и безопасное продолжение. Recovery extraction и projector не являются summary owner.

## Decisions
Удалить packet путь полностью, а не заменить другим хранилищем. Сохранить один короткий customInstructions для native fallback: TODO authoritative only for multi-step project work; preserve exact evidence and unresolved constraints, no task guesses. Не менять контракты compaction boundary и ручного продолжения. Старые пользовательские packets оставить на диске.

## Risks
Чатовые договорённости по-прежнему могут отсутствовать в seed index; удаление packet это не исправляет. Аудит различает отсутствие в индексе, наблюдаемый сбой восстановления и причинно доказанную потерю контекста. Не публиковать исходные логи. Изменения исходников не активируются в установленном runtime автоматически.

## Validation
Сначала regression: HOME с недоступным для создания .pi каталогом не мешает threshold compact. Проверить отсутствие новых packet файлов и ссылок, обе последовательности extension load в реальном SDK без model/auth calls, ошибки/смену сессии/manual idle. Полный npm test и OpenSpec strict gate, review diff, archive/commit, финальный snapshot gate и push/remote HEAD.
