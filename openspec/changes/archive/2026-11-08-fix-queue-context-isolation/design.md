## Context

Причины и согласованный объём — в proposal.md. Источник — этот репозиторий, Pi 1.4.0 и context-fold 0.7.0 по конфигурации проекта. Начальное состояние: изменённый `TODO.md`, untracked `.pi/tasks/` и чужой `enable-canary-500k-cache-warming`; их нельзя включать в commit исправления или переписывать.

Выборочно проверена история сессий; исходные переписки не копируются в Git:
- 2026-10-31, Firstmate session `01a1925a…`: на текущей сохранённой ветке сообщения `5d3b71fe` и `5dabc78b` показывают остановку из-за TODO и последующее признание очереди Firstmate. Это наблюдение поведения, а не доказательство причины каждого сбоя.
- 2026-10-22, session `01a16570…`, message `2e9cd606`: уже отмечался риск подъёма до родительского TODO. В `store.ts` нет границы проекта; ошибочная запись в чужой TODO пока не доказана.
- Содержимое проверенных runtime файлов `store.ts`, `checks.ts`, `auto-ultra-compact/index.ts` совпало с source. Это не доказывает, какой код загружен каждым ранее запущенным процессом.

Точки изменения/проверки:
- `auto-ultra-compact/index.ts`: TASK_RESTORE_INSTRUCTIONS/RESTORE_MESSAGE и отдельные compact customInstructions сейчас требуют TODO без исключения Firstmate.
- `configs/APPEND_SYSTEM.md` требует TODO при восстановлении; `configs/AGENTS.md` сохраняет только task-switch exception при project APPEND override.
- `findTodoPath` вызывают `todo-queue/index.ts`, `todo-queue/panel.ts`, `task-session.ts`; последний различает отсутствие TODO по существующему error prefix.
- context-fold patch распознаёт старый restore envelope по точному префиксу в двух индексах; изменение начала follow-up без согласования загрязнит User intents.
- `install.sh` сейчас отказывает при любом отличии уже существующего управляемого раздела AGENTS. Изменение шаблона требует безопасной миграции только известной предыдущей версии, иначе следующая установка будет заблокирована.

## Goals / Non-Goals

**Goals:** один общий безопасный resolver и непротиворечивые инструкции по владельцу задач, без нового task store, зависимостей или role-classifier. Сохранить существующие запреты бросать работу, менять сессии с незавершёнными проверками и обходить recorded checks.

**Non-Goals:** изменение внутренней очереди Firstmate, автоматическое распознавание роли по сообщениям/путям/env, исправление всех найденных проблем task_queue, увеличение ресурсных лимитов, установка в runtime.

## Decisions

### 1. Условные инструкции вместо определения роли кодом

Использовать единый короткий смысловой контракт: при действующем контракте супервизора Firstmate читать его текущую очередь/state; иначе для многошаговой проектной работы читать текущий TODO. При неясной задаче остановиться и спросить в обоих случаях. Это применяется к постоянным правилам, compact customInstructions и follow-up. Не определять роль по слову Firstmate или произвольным данным истории. Альтернатива — новый runtime detector — добавляет ненадёжную авторизацию и лишний код.

AGENTS сохраняет исключение независимо от project APPEND. APPEND и injected restore text не должны ему противоречить. SDK regression проверяет реально собранный prompt при trusted project APPEND override; это не доказательство качества поведения живой модели.

### 2. Общая граница поиска, а не исправления в каждом caller

Канонизировать исходный каталог; найти ближайшую enclosing `.git` границу, включая file-marker linked worktree. В её пределах выбирать ближайший TODO снизу вверх. Для non-Git каталога разрешить только исходный каталог. Не считать AGENTS самостоятельным маркером границы: вложенные инструкции не обязательно обозначают новый проект. Не добавлять выбор произвольного cwd в mutation API или новый конфиг очереди.

TODO с внешней canonical целью не должен проходить границу. Отсутствие файла отличать от ошибок доступа; не скрывать ошибку переходом к другому TODO. Сохранить совместимость not-found error с task-session caller либо изменить caller и тест одновременно. Панель не должна показывать старую/чужую очередь.

Альтернатива с подъёмом до HOME всё ещё смешивает соседние проекты; поиск только в cwd сломает обычные вложенные каталоги одного Git worktree. Non-Git parent inheritance сознательно убирается: для такого проекта запускать Pi из его корня с локальным TODO.

### 3. Согласовать точные restore envelopes

Если owned follow-up получает новый префикс, дополнить существующий context-fold patch точным новым envelope и сохранить старый для исторических сообщений. Не применять широкий фильтр по словам Firstmate/TODO. Проверить soft/hard indexes и похожий обычный текст. Существующий shortcut по отсутствию provenance не расширяется до эвристического фильтра.

### 4. Безопасная будущая установка AGENTS

В source installer разрешить замену только точного старого managed Firstmate блока на новый. Сохранять остальные bytes, не принимать неизвестные варианты и symlink destination; повторный запуск idempotent. Проверить в существующей временной portable fixture. Это подготовка совместимости source, не разрешение запуска installer над личным профилем. Private APPEND при preserve-settings не переписывать.

### 5. Регрессионные проверки до source fix

Расширить существующие assert-based suites, не вводить отдельную тестовую систему:
- TODO store: отсутствующий локальный TODO при наличии родительского, вложенная независимая Git-копия, `.git` file, обычный subdir, non-Git local-only, canonical alias и внешний TODO link, ошибка доступа.
- SDK queue/panel/task-session: чужие задачи не видны, не мутируются и не блокируют handoff; собственная current task продолжает защищать handoff.
- auto compaction/Firstmate policy: ownership-aware инструкции в обоих источниках compact/follow-up, реальная SDK-сборка global AGENTS + project APPEND, отсутствие второго summary owner и network/model calls.
- context-fold: старый/новый envelope не становится User intent; обычные запросы и queue task body сохраняются.
- installer fixtures: известный старый блок мигрирует, private sections сохраняются, неизвестный конфликт/links отвергаются.

Сначала зафиксировать красные regression outcomes на прежнем source, затем минимальный fix. После него обязательны полный `npm test`, strict OpenSpec validation, diff check и полный owned diff review против начального состояния. Нужный SDK уже используется проектом; новая инфраструктура и платные проверки не требуются.

## Risks / Trade-offs

- [Non-Git subdir больше не наследует TODO] → явная breaking change в proposal/specs и тест локального cwd; не подменять это скрытым HOME fallback.
- [Граница через alias/link] → canonical paths и внешняя TODO-link regression; не обещать устранение всех конкурентных filesystem races.
- [Противоречия между глобальными/проектными правилами] → исключение в AGENTS и реальные SDK prompt-assembly tests; произвольные сторонние инструкции этот change не переписывает.
- [Новый restore prefix загрязнит summary] → согласованная правка patch и обоих index fixtures с обратной совместимостью.
- [Обновление шаблона заблокирует installer либо затрёт частные правила] → exact-known-block migration, idempotency и отказ при неизвестном конфликте.
- [Offline тесты не доказывают live поведение] → не заявлять исправленную работу текущих процессов или Firstmate fleet без отдельной проверки после согласованного deployment.

## Planning Validation

- `openspec validate fix-queue-context-isolation --strict`: PASS, exit 0.
- `openspec status --change fix-queue-context-isolation`: 4/4 planning artifacts complete; это не выполнение apply tasks.
- `git diff --check`: PASS для tracked diff; новые owned artifacts дополнительно просмотрены целиком, без копий переписок/credentials.
- На стадии proposal код и runtime не менялись, regression и `npm test` не запускались. Они остаются обязательными gates apply-фазы. CI и live Firstmate поведение не проверены.

## Migration Plan

Реализация и commit исходников/specs/tests — отдельная apply-фаза после принятия плана. Production не запускать. Перед будущей установкой требуется отдельное разрешение, backup и чтение `docs/diagnostics-and-rollback.md`; после установки потребуется reload/restart нужных сессий. Устаревшие private APPEND сохраняются и при наличии противоречий требуют согласованной отдельной правки. Архивировать change только после PASS всех apply tasks и фиксации evidence; CI без реального job остаётся непроверенным.
