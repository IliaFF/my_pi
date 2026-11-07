# Evidence: queue-format-aliases-and-autocreate

Дата: 2026-11-08. Ветка `main`, база `fbe1a1e` (docs: archive verified Pi 1.5.0 deployment).
Полный diff этого change: `local-extensions/todo-queue/{core,store,panel,index}.ts`, `local-extensions/todo-queue/README.md`, `scripts/test-todo-queue.mjs`, `scripts/test-todo-queue-sdk.mjs`, `openspec/changes/queue-format-aliases-and-autocreate/`.

## 1. RED до реализации

Регрессионные тесты добавлены раньше кода. Прогон против прежних `core.ts`/`store.ts`:

```text
$ node --test scripts/test-todo-queue.mjs
✖ section aliases and plain active bullets are recognized (1.547481ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  + []
  - [ 'Скачать тренировочный CSV', ... ]
✖ one logical section may use several spellings and plain history stays out
✖ marked non-Git project root serves nested directories
  AssertionError [ERR_ASSERTION]: The input did not match the regular expression /TODO.md not found above/
✖ missing TODO is created at the project root, not in the nested directory
✔ queue is never created in protected locations
ℹ tests 30 / pass 26 / fail 4
```

SDK-проверка до реализации падала на `AssertionError: No project file at startup means no foreign parent watcher` (1 !== 0): старт сессии без `TODO.md` не создавал файл, поэтому и watcher не появлялся.

## 2. Что изменено

- `core.ts`: разбор `##` заголовков по группам с псевдонимами (`В работе`, `Ожидает`, `Блокировано`, `Завершено`), обычные пункты `- текст` только в активных разделах, `Completed` по-прежнему требует `- [x]`. Точка вставки привязана к латинскому заголовку своей группы (иначе к первому заголовку группы), изменённая задача пишется каноническим чекбоксом. Повтор одинакового написания заголовка остаётся ошибкой; повтор посторонних заголовков (например `## Notes`) по-прежнему игнорируется.
- `store.ts`: граница проекта — ближайший каталог с `.git` или `AGENTS.md` (иначе стартовый каталог); `findTodoPath()` только читает, `ensureTodoPath()` создаёт заготовку `wx`-записью в корне проекта и не делает этого в `$HOME`, `/`, `/tmp`.
- `panel.ts` использует `ensureTodoPath()` после проверок TUI/trust; `index.ts` — на изменяющих путях (`+`, `/queue add|edit|delete|move`, `task_queue` кроме `list`/`checks`), чтение осталось на `findTodoPath()`. `task-session.ts` не менялся: handoff по-прежнему не создаёт файл и не блокируется чужой очередью.

## 3. Проверки на окончательном scope

```text
$ node --test scripts/test-todo-queue.mjs
ℹ tests 30 / pass 30 / fail 0

$ PI_OFFLINE=1 node --require ./scripts/no-network.cjs scripts/test-todo-queue-sdk.mjs "$PWD/npm/node_modules"
PASS actual queue SDK: existing selection/errors/history plus native themed tree, shortcut, resize/global expansion, real width handling, collapse, atomic external edit, parse recovery, reload, missing/empty files, non-TUI and shutdown cleanup; no production TODO mutation

$ PI_OFFLINE=1 node --require ./scripts/no-network.cjs scripts/test-task-session-sdk.mjs "$PWD/npm/node_modules"
PASS native task-session SDK: related/uncertain stay, FIFO assessment, cancellation, fresh automatic execution/images, no old transcript, five-task budget across sessions, reload, TODO ownership and surfaced native creation failure

$ npx --no-install openspec validate queue-format-aliases-and-autocreate --strict --no-interactive
Change 'queue-format-aliases-and-autocreate' is valid
```

SDK-проверка расширена: доверенный TUI-старт в temp-проекте без `TODO.md` создаёт стандартную заготовку, `task_queue list` по-прежнему возвращает not-found, `task_queue add` создаёт файл и запись, headless-старт файл не создаёт, родительская чужая очередь не читается и не меняется.

### Обязательный полный гейт

```text
$ PI_OFFLINE=1 npm test        # python3 scripts/test-build.py
PASS contract/openspec: exit=0 (1.732s)
PASS contract/ci-config: exit=0 (0.122s)
PASS unit/harness: exit=0 (74.74s)
PASS unit/release: exit=0 (10.445s)
PASS integration/install-rollback: exit=0 (3.497s)
PASS unit/portable-stack: exit=0 (1.937s)
PASS unit/stack-bootstrap: exit=0 (0.184s)
PASS unit/loop-pilot: exit=0 (0.233s)
PASS unit/queue-checks: exit=0 (0.825s)
PASS integration/patch-apply: exit=0 (0.273s)
PASS integration/patch-verify: exit=0 (0.388s)
PASS integration/context-fold-index: exit=0 (0.88s)
PASS integration/compaction-sdk: exit=0 (0.779s)
PASS integration/stack-surface: exit=0 (1.182s)
PASS integration/native-quota-sdk: exit=0 (0.678s)
PASS integration/firstmate-policy-sdk: exit=0 (0.831s)
PASS integration/deferred-tools-sdk: exit=0 (1.794s)
PASS integration/remote-shell-sdk: exit=0 (17.707s)
PASS integration/train-agents: exit=0 (1.335s)
PASS integration/queue-sdk: exit=0 (11.843s)
PASS integration/queue-checks-sdk: exit=0 (12.17s)
PASS integration/task-session-sdk: exit=0 (2.649s)
PASS integration/ponytail-sdk: exit=0 (0.726s)
PASS integration/background-jobs: exit=0 (3.152s)
PASS integration/loop-sdk: exit=0 (0.844s)
PASS integration/context-runtime: exit=0 (0.776s)
PASS smoke/rpc-startup: exit=0 (3.608s)
PASS build; report: test-results/results.json
GATE_EXIT=0
```

27/27 проверок PASS, exit 0. Контрольные суммы всех изменённых файлов change до и после прогона совпали (`sha256sum -c`), то есть гейт шёл на окончательном scope и не пересекался с правками. `git diff --check` чист.

### Промежуточный провал и исправление

Первый полный `npm test` упал на `openspec validate` для самого change: MODIFIED-блок требования терял существующий сценарий `Non-Git directory`, а ADDED-требование было длиннее порога парсера. Исправлено: сценарий `Non-Git directory` вставлен в MODIFIED-блок, длинное ADDED-требование разделено на два. Код и тесты при этом не менялись.

## 4. Ограничения

- Проверки идут на Node в этом WSL-окружении, без сети (`PI_OFFLINE=1`, `--require ./scripts/no-network.cjs`); живой провайдер, Telegram, Chrome и CI не проверялись.
- Установка в `~/.pi/agent` и перезапуск личных сессий не выполнялись: это отдельное согласование с backup.
- `task-session.ts` намеренно не переведён на `ensureTodoPath()`: автосоздание очереди при handoff не требуется и не проверялось.
