# Proposal

## Why

Запрошенная публикация двух исправлений глобальных инструкций выявила, что Git-сборка не воспроизводит текущий пользовательский стек. Captain явно расширил задачу до всего выявленного стека и выбрал установленную реализацию paper-search, без личных данных, описаний удалённых хостов и SSH-настроек.

## What Changes

- Перенести только удаление постоянной Herdr-routing строки и исключение Firstmate из task-switch handoff; сохранить запрет бросать работу/проверки и обычный контракт вне Firstmate.
- Добавить portable глобальный AGENTS.md с разделом Firstmate и позднее согласованным ресурсным правилом, безопасно сохраняя другие инструкции пользователя. Ресурсный абзац публикуется только в AGENTS без дублирования в новом APPEND; разрешение на существенные дополнительные затраты даёт пользователь, не supervisor.
- Добавить установку отдельного Firstmate checkout на commit 7da4c3621370534ff9689843d2b77f34158057fb из kunchenguid/firstmate; его project extensions остаются project-scoped. Herdr backend сохраняется, глобальные расширения Firstmate не дублируются.
- **BREAKING**: убрать default pi-herdr-agents@3.3.1, добавить pi-workspace-history@0.5.2; не удалять Herdr backend, данные агентов или поддержку Herdr в Firstmate.
- Добавить cpp-styleguide, python-styleguide и latex-simple-style, Jev browser MCP 0.8.3, paper-search MCP 0.1.4 с ровно установленным переносимым patch, AITunnel provider без credentials.
- Зафиксировать необходимые версии backend/tooling и зависимости, предусмотреть изолированную установку и проверяемый rollback. Текущий production/runtime не обновлять.

## Capabilities

### New Capabilities

- `portable-user-stack`: установка согласованного переносимого стека, независимые Firstmate/MCP окружения и защита личных данных.

### Modified Capabilities

- `general-agent-policy`: исключение Firstmate и удаление постоянной package-specific routing строки.
- `task-session-continuity`: Firstmate lifecycle вместо автоматического native handoff, без изменения runtime инструмента.
- `herdr-agents-adoption`: retirement default Pi plugin без удаления backend и пользовательских данных.
- `deferred-tool-loading`: default loadout без Herdr Pi plugin, остальные native deferred capabilities сохранены.
- `build-validation`: проверки нового состава, установки, инструкций, SDK и rollback.

## Impact

Затронуты configs, installer/uninstaller, manifest, npm locks, local provider/skills, MCP/bootstrap scripts, release/SDK tests и документация. Исходный Git: IliaFF/my_pi, main, 75c6ecd; до работы checkout чистый, fetch подтвердил совпадение origin/main. Историческое упоминание core 1.3.0 в OpenSpec context исправлено на реальные pins 1.4.0; обновление core в scope не входит. При финальном fetch найден новый origin/main 8e9d4e5 с пятью обновлениями пакетов. Пользователь отдельно разрешил интеграцию и точечную подготовку шести затронутых зависимостей в существующем изолированном кэше (50 MiB download, 500 MiB additional disk, 600s), затем один дополнительный offline gate до 900s. Полная переустановка, перенос node_modules и production не входят в это согласование.

Не затрагивать Firstmate checkout, paper-search working tree (с несвязанными dirty изменениями), пользовательские instructions/auth/settings, SSH, удалённые машины, службы, live agent runs и upstream repositories. Публикация разрешена только в IliaFF/my_pi, без force push и PR merge. Offline проверки не доказывают доступность live MCP/провайдера, качество агентов или совместимость реального Herdr fleet.
