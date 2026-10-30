# Долгоживущие исполнители: Herdr и Durable

Это первый этап проверки. [Следующий этап: реальный Herdr spawn и sidebar](herdr-sidebar-integration.md) подтвердил запуск выбранного контекстного профиля, persistent reuse, два сжатия и rendered Focus/All. Историческая таблица ниже относится к первому этапу; production и автономная реальная многоконная задача по-прежнему не проверены.

## Решение и границы

Делегирование оправдано только для самостоятельной независимой задачи, прогнозируемо требующей **более одного окна контекста после текущих folding, recall и compaction**. Размер файлов, длинный лог или длительность процесса сами по себе не являются основанием. Небольшие исследования и прототипы остаются у родителя; неясную цель пользователя нужно уточнять. Переполнять окно перед делегированием не требуется.

Исполнитель должен сохранять цель, ограничения, прогресс и evidence между циклами контекста. Родителю возвращаются краткий результат, проверки и пути к артефактам. Новое правило — instruction-level policy, не программный token gate. Оно не разрешает production-установку, платные запросы или агентов через shell-only background pilot и не заменяет последовательный native task handoff.

Правило записано в `configs/APPEND_SYSTEM.md` и родительском `fresh_pi/AGENTS.md`. Первый файл версионируется здесь; родительский каталог не является Git-репозиторием. Установленный профиль не изменён.

**Предварительный выбор: Herdr ближе к нашей контекстной системе, но ни один кандидат пока не активирован и не сертифицирован для автономной многоконной работы.** Durable выигрывает по сохранению состояния исполнения, но его ребёнок не наследует наши контекстные расширения.

## Зафиксированные кандидаты

| Компонент | Версия / revision |
|---|---|
| Pi SDK сборки | `@earendil-works/pi-coding-agent@1.4.0` |
| Node / Herdr CLI | `24.18.0` / `0.9.3` |
| [pi-herdr-agents](https://github.com/giuseppecrj/pi-herdr-agents) | `3.3.1`, `8864764e65a469f7d90f9a0deb39ec3f0b26befc` |
| [pi-durable-subagents](https://github.com/anasalqoyyum/pi-durable-subagents) | `0.1.0`, `50b1d290eb7aed1079e2272270e95b2d2e507aab` |
| Durable кандидата | `@earendil-works/pi-durable@1.0.0`, `@earendil-works/chord@1.0.0` |
| SDK в upstream lock обоих кандидатов | `1.1.0` — не заменяет отдельную пробу на нашем `1.4.0` |

Исходная сборка чистая на `5e43d87`. Кандидаты клонированы в приватный `/tmp/pi-multiwindow-evaluation-20261024`, зависимости установлены `npm ci --ignore-scripts --workspaces=false`. Их исходники после установки и тестов остались чистыми. Нет production-установки, скопированных auth/session файлов, внешних запросов к моделям, публикации или push.

## Что реально проверено

| Проверка | Результат | Что НЕ доказывает |
|---|---|---|
| Upstream Durable `npm test`, пустой HOME, Node network guard | **55 passed**, 0 failed, 0 skipped | Качество реальной модели и восстановление реального облачного запроса |
| Upstream Herdr `npm test`, fake Unix sockets, пустой HOME | **1010 passed**, 0 failed, 1 skipped | Реальный запуск панелей Herdr и рабочий профиль ребёнка |
| Herdr child protocol + context-fold + auto-ultra-compact + pi-context на SDK 1.4.0 | **2 deterministic compactions**, 0 model calls; context tools доступны | Автоматическое наследование полного профиля при настоящем spawn |
| Durable parent extension + тот же контекстный стек на SDK 1.4.0 | **2 deterministic compactions**, 0 model calls | Наличие этого стека у Durable-ребёнка |
| Реальный Durable child runtime, faux provider, 2 ручных сжатия и reopen SQLite | **PASS**, та же child conversation, 2 faux summary calls, последующий ответ получен | Сохранение всех смысловых ограничений настоящей моделью и эквивалентность нашей системе |
| Policy regression | Новый текст отсутствовал: FAIL; после записи: PASS | Принудительное соблюдение политики моделью |

Единственный skip Herdr: `late sidecar after pane absence resolves done when supported` — upstream fixture явно не поддерживает этот implementation-specific сценарий.

Первый Herdr suite запуск с общим `no-network.cjs` дал **987 passed, 23 failed, 1 skipped**: guard запрещал подключения к собственным fake Unix sockets. Это ошибка границы тестового стенда, не доказанный дефект расширения. Повторный запуск разрешает только `/tmp/fake-herdr-*/herdr.sock` и заведомо отсутствующий fixture path `/nonexistent/herdr.sock`; TCP, HTTP, fetch и посторонние Unix sockets запрещены. У guard есть отрицательные self-checks. Node guard не является OS sandbox и не ограничивает произвольную сеть shell-процессов.

## Различие контекстных систем

### Herdr

`maestro/adapters/pi/launch.ts` строит настоящий запуск `pi`, передаёт agent directory и child protocol через `-e`, не добавляет `--no-extensions`. Значит, обычный Pi может использовать установленный контекстный стек. Это **возможность по коду**, а не подтверждённое наследование нашего полного runtime.

Важная граница: `tools` роли превращается в `--tools`. Allowlist вроде `read,bash` может сделать `recall_folded`, `context_search` и остальные контекстные инструменты неактивными. Первая версия нашей SDK fixture с таким ограничением действительно не имела активного `recall_folded`; основная проба использует обычные defaults. Нельзя считать профиль пригодным только потому, что расширения загрузились: нужно отдельно проверять активные инструменты.

SDK-проба загружает настоящий child protocol совместно с тремя контекстными расширениями, подтверждает единственного владельца `session_before_compact`, наличие `recall_folded`, `unfold`, `context_search`, `context_get`, `context_export`, сохранение активных recall/search/get после каждого сжатия, две детерминированные compaction entries и отсутствие model calls. Контракт задачи хранится отдельным `TODO.md`; его сохранность проверена, но автоматическое восстановление всех его ограничений моделью не проверено.

В child protocol завершение привязано к `agent_settled`, а не к промежуточному `agent_end`. Upstream suite содержит сценарий transient compaction error и сохранения compaction entries при fork. Это уменьшает риск ошибочно объявить завершённой работу, которая продолжает сжиматься/повторяться, но не заменяет настоящий многооконный прогон.

### Durable

`src/runtime.ts` создаёт собственный Harness с `Coding` extension. `src/tools.ts` даёт детям `read`, `write`, `edit`, `bash`, отобранные конфигурацией роли. Parent MCP, codemode, context-fold, pi-context и auto-ultra-compact туда автоматически не передаются.

У Durable есть собственное сжатие: defaults установленного `pi-durable@1.0.0` — `enabled: true`, `reserveTokens: 16384`, `keepRecentTokens: 20000`, `backgroundTokens: 32768`. Оно по умолчанию запрашивает у модели структурированный summary; наш seed-index без model call не используется.

Отдельная проба создаёт настоящую child conversation, накапливает синтетическую историю, дважды вызывает её `compact()`, закрывает/открывает SQLite и отправляет follow-up в того же ребёнка. Проверено, что в запросе продолжения есть scripted summary и только выбранный `read`, без контекстных инструментов родителя. Сохранение контрольного ограничения в этой пробе **задано faux provider**, а не является результатом reasoning.

## Жизненный цикл и recovery

| Свойство | Herdr agents | Durable subagents |
|---|---|---|
| Исполнение | Отдельный полноценный Pi в панели Herdr | Durable conversations в процессе родительского Pi |
| Последовательные поручения | Persistent specialist, один task одновременно; busy send отклоняется | Follow-ups, включая сохранённого завершившего работу ребёнка |
| Возврат результата | Асинхронное bounded сообщение родителю | Background reports и сохранённые результаты |
| Сбой ребёнка | Persistent specialist не revive/resume; нужен новый | Сохранённое состояние открывается с той же parent session |
| Обычный resume | Есть, но не для persistent и managed-worktree sessions | Та же conversation восстанавливается из SQLite |
| После закрытия родителя | Дочерний процесс может иметь отдельный lifecycle; доставка зависит от живого родителя, без обещания полного восстановления | Дети не работают отдельным демоном; исполнение приостанавливается до reopen |
| Опасные повторы | Нет гарантии exactly-once внешних действий | `read` replay-safe; `write`, `edit`, `bash` unsafe и не повторяются автоматически после прерывания |
| Worktree | Изолирует Git-файлы, не права процесса | То же; отсутствующий checkout не должен подменяться parent cwd |

Durable upstream тесты реально проверяют SIGKILL/exclusive ownership, reuse child/submission без duplicate admission, pending model/task recovery, остановку настоящего shell и отсутствие unsafe replay. Все модели в этих проверках faux, не облачные.

## Как воспроизвести

Из `pi-build/`, с отдельными checkout на указанных SHA:

```bash
npm ci --prefix "$DURABLE" --ignore-scripts --workspaces=false
npm ci --prefix "$HERDR" --ignore-scripts --workspaces=false

env -i PATH="$PATH" HOME="$EMPTY_HOME" PI_CODING_AGENT_DIR="$EMPTY_AGENT" \
  NODE_OPTIONS="--require=$PWD/scripts/no-network.cjs" npm test --prefix "$DURABLE"
env -i PATH="$PATH" HOME="$EMPTY_HOME" PI_CODING_AGENT_DIR="$EMPTY_AGENT" \
  NODE_OPTIONS="--require=$PWD/scripts/no-network-fake-herdr.cjs" npm test --prefix "$HERDR"

node scripts/evaluate-long-lived-agents.mjs herdr "$HERDR"
node scripts/evaluate-long-lived-agents.mjs durable "$DURABLE"
node scripts/evaluate-durable-child.mjs "$DURABLE"
```

SDK-пробы сами создают временные agent/session каталоги, запрещают сетевые вызовы Node и удаляют только свои fixtures. Для максимальной изоляции запускать их также через `env -i PATH="$PATH" HOME="$EMPTY_HOME"`. Они opt-in: обязательный gate не скачивает кандидатов; проверяет policy, синтаксис probe scripts и отрицательные network self-checks.

Полные upstream логи сохранены вне Git в `/tmp/pi-multiwindow-evaluation-20261024/logs/`; переносимая сводка — этот документ и OpenSpec evidence. В Git не входят npm trees, базы, личные настройки или sessions.

## Что нужно до активации

1. Проверить планируемый production/codemode/roles профиль и безопасный tool allowlist. Настоящий Herdr spawn выбранного контекстного профиля, persistent reuse, два ручных context cycles и sidebar уже проверены отдельно — см. [follow-up report](herdr-sidebar-integration.md). Это ещё не проверка всего production runtime.
2. По отдельному согласованию выполнить реальную задачу больше одного управляемого окна. Проверять цель, ограничения, прогресс, артефакты, качество результата, recovery и стоимость — не только число compaction entries.
3. Если требуется Durable: отдельно решить, допустимо ли его собственное модельное сжатие или нужен адаптер нашей контекстной системы. Сейчас такого адаптера не реализовано.

Не добавляли custom orchestrator, live/paid calls, новые runtime dependencies, готовые роли или автоматический выбор кандидата. Раздельный Durable host под supervisor для работы при закрытом Pi в эту проверку не входит.
