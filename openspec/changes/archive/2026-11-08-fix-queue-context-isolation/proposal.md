## Why

История сессий выявила конфликт двух источников задач: 31 октября Firstmate после сжатия останавливался из-за отсутствующего корневого TODO, хотя его очередь существовала. Дополнительно `findTodoPath()` ищет доступный TODO до `/`, поэтому проект без собственной очереди способен выбрать родительскую очередь другого проекта; факт ошибочной записи из истории пока не установлен.

## What Changes

- Согласовать правила восстановления после сжатия: в сессии под контрактом супервизора Firstmate продолжать по его актуальной очереди и состоянию; вне этого контракта сохранить обязательный TODO для многошаговой проектной работы.
- Применить это различие к постоянным инструкциям, compact customInstructions и автоматическому follow-up. Наличие слова Firstmate в обычной переписке не определяет роль.
- Ограничить общий поиск TODO ближайшим Git worktree; в каталоге без Git искать только в исходном рабочем каталоге. Вложенные каталоги одного worktree сохраняют доступ к его TODO; вложенный самостоятельный репозиторий не наследует очередь внешнего.
- **BREAKING**: убрать неявное наследование TODO из родительских каталогов для non-Git проектов. Такие проекты запускаются из каталога с собственным TODO; новый параметр выбора очереди не добавляется.
- Проверить общую реализацию через callers queue/panel/task-session, настоящую SDK-сборку инструкций и compaction/index integration.
- Вне объёма: лимиты и жизненный цикл snapshots/checks, stale-текст блокировок, очередь сообщений Pi, изменения Firstmate upstream, runtime установка, live model calls, публикация логов.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `compaction-reliability`: восстановление учитывает владельца задач, не добавляя второго summary owner или модельного определения роли.
- `general-agent-policy`: исключение Firstmate распространяется на восстановление задач после сжатия, включая project APPEND override.
- `task-selection`: поиск TODO ограничен проектом, все callers используют один resolver.

## Impact

- `local-extensions/auto-ultra-compact/index.ts`, `local-extensions/todo-queue/store.ts`; callers `todo-queue/index.ts`, `todo-queue/panel.ts`, `task-session.ts` проверяются и меняются только при необходимости.
- `configs/AGENTS.md`, `configs/APPEND_SYSTEM.md`; шаблонные/SDK проверки и безопасный путь слияния управляемого раздела AGENTS при будущей установке.
- `patches/context-fold+0.7.0.patch` и index fixtures — если изменение точного restore envelope требует согласованной правки распознавания; обычные user intents и старые owned envelopes должны сохраниться.
- Существующие tests для TODO, task-session, auto compaction, Firstmate policy и portable stack; обязательный `npm test` после реализации.
- Источник — репозиторий; установленная копия и личные настройки не меняются. Существующие чужие изменения TODO/.pi/tasks/Canary сохраняются.
