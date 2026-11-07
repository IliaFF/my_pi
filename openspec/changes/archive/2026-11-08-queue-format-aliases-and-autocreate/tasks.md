## 1. Regression first

- [x] 1.1 Добавить в `scripts/test-todo-queue.mjs` тесты формата: псевдонимы разделов с чекбоксами, обычные `-` в активных разделах и их отсутствие в `Completed`, слияние «Ожидает» + «Pending» с вставкой под `## Pending`, сохранение ошибки на повтор одинакового заголовка; зафиксировать RED в `evidence.md`.
- [x] 1.2 Добавить там же тесты поиска и создания: подкаталог проекта без Git с `AGENTS.md` находит корневой TODO; отсутствие TODO создаёт заготовку в корне из подкаталога; `$HOME`/`/tmp`/`/` не создают файл; существующий нечитаемый TODO не перезаписывается; `EEXIST` не портит файл.
- [x] 1.3 Добавить в `scripts/test-todo-queue-sdk.mjs` проверку настоящего SDK: старт сессии в temp-проекте без TODO создаёт файл и `task_queue add` работает; non-TUI и session-scoped untrusted не создают файл, панель пустой очереди остаётся скрытой.

## 2. Implementation

- [x] 2.1 Переписать разбор `core.ts`: группы разделов, псевдонимы, обычные `-` только в активных разделах, канонический выбор точки вставки; обновить callers claim/reopen/move/edit/delete.
- [x] 2.2 Добавить в `store.ts` определение корня по `.git`/`AGENTS.md` и `ensureTodoPath()` с заготовкой, защищёнными путями и `wx`; перевести на него `panel.ts` и `index.ts`, оставить `task-session.ts` на `findTodoPath()`.
- [x] 2.3 Обновить `README.md` расширения: формат разделов и пунктов, маркер корня, автосоздание и его границы.

## 3. Verification

- [x] 3.1 `node --test scripts/test-todo-queue.mjs`, `node --require ./scripts/no-network.cjs scripts/test-todo-queue-sdk.mjs`, `node --require ./scripts/no-network.cjs scripts/test-task-session-sdk.mjs` — PASS, записать команды, окружение и exit codes.
- [x] 3.2 Обязательный `npm test`, `openspec validate --all --strict --no-interactive` и `git diff --check` на окончательном scope; ограничения (нет live/runtime установки) записать в `evidence.md`.
- [x] 3.3 Просмотреть полный owned diff, подтвердить сохранность чужих изменений и коммит только source/specs/tests/docs.

## Workflow follow-up

- Синхронизировать specs и архивировать change после PASS.
- Установка в `~/.pi/agent` и перезапуск личных сессий — отдельное согласование с backup.
