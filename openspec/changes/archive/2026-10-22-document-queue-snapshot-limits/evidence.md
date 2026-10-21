# Evidence

## Scope and review

Начальный Git worktree чистый, HEAD `03e0a9b`. Изменён только английский description task_queue в `local-extensions/todo-queue/index.ts`; параметры, callers, runtime guards, fixtures и exports не менялись. Полный diff и все новые артефакты просмотрены. Предупреждение сохраняет возможность обоснованного explicit supersede не запущенного preflight, но запрещает обход отказа посредством evidence, удаления ссылок либо произвольного сужения scope.

## Validation

- Recorded check `2d55bf1d-548c-49a2-ad0c-bce711514803`, job `b143a54c2`: `npm test && openspec validate document-queue-snapshot-limits --strict --no-interactive && git diff --check`, exit 0.
- `npm test`: 22/22 PASS, включая queue unit, actual queue/check SDK integration и RPC smoke.
- OpenSpec: documentation-only `skip_specs: true`, zero deltas accepted.
- Новая failing regression не требуется: нет изменения поведения/ветвлений; существующие тесты сохраняют покрытие snapshot refusal и preflight recovery.
- После archive выполняется отдельная финальная проверка snapshot и локальный commit; точные terminal evidence фиксируются в authoritative root TODO/queue ledger.

## Repeat and timeout diagnosis

Первый check был reconciled только после изменения documentation/archive, поэтому before/after различались; его exit 0 не является stable ledger proof. Возвращён active change и выполнен same-command rerun. Попытка `2897ceaa-79b0-45d1-a7e9-b163cff34d19` упала по внешним 60s timeout на background-jobs/RPC, без assertion output; соседние loop/context stages одновременно замедлились до 88/62s. Сохранены исходные результаты в локальном `/tmp/pi-queue-description-timeout.sD3Nvh/`. Диагностика позже показала нормальный scheduler/sleep; точная причина задержки не доказана. Чужие процессы не остановлены, код и deadlines не менялись.

Same-command check `898bb484-7b17-4655-a563-cabaace0e8b1` / job `b0c89a08e`: exit 0, 22/22 PASS; background-jobs 3.081s, RPC 4.384s. Ledger reconciled через checks до последующих правок. Это покрывает исходную обязательную команду и не скрывает неуспешную попытку.

Пользователь дополнительно согласовал push и установку после PASS с backup/preserve-settings. Итог установки и remote SHA фиксируются в root TODO, не в личных файлах репозитория.

## Limits

Установленная копия не менялась, production deployment, push, CI и live providers не запускались. Поддержка symlink/submodule не добавлена.
