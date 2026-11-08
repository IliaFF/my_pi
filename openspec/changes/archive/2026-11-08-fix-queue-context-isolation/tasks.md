## 1. Ownership-aware restoration

- [x] 1.1 До source fix добавить regression в существующие auto-compaction и Firstmate-policy SDK tests: Firstmate без TODO, обычная tracked сессия, project APPEND override и упоминание Firstmate без role contract; записать точные failing результаты в evidence.md, не делать live model calls.
- [x] 1.2 Согласовать auto compact customInstructions/follow-up и configs/AGENTS.md + APPEND_SYSTEM.md: очередь/state Firstmate под supervisor contract, TODO вне него, stop при неясной identity; целевые tests из 1.1 должны пройти, старые manual/error/session-change/load-order проверки оставаться PASS.
- [x] 1.3 Добавить failing old/new restore-envelope regression к soft/hard context-fold indexes и при необходимости обновить существующий patch и fixtures; проверить исключение обоих control envelopes и сохранение обычных user intents/queue bodies реальной SDK compaction integration. Описать изменение восстановления в пользовательской документации.

## 2. Project-bounded TODO discovery

- [x] 2.1 До изменения resolver добавить failing store tests для чужого parent TODO, вложенного Git repo, linked worktree, non-Git local-only, canonical alias/внешней TODO link и ошибок доступа; сохранить положительную проверку parent TODO внутри того же Git worktree и зафиксировать RED в evidence.md.
- [x] 2.2 Исправить общий findTodoPath без новых настроек/зависимостей, проверить callers queue, panel и task-session и их not-found/error handling; unit tests из 2.1 должны стать PASS, foreign TODO bytes оставаться неизменными. Документировать non-Git breaking change и запуск из каталога с локальным TODO.
- [x] 2.3 Расширить реальные SDK queue/task-session проверки и существующие panel tests: чужие задачи не видны/не мутируются/не блокируют handoff, собственная current task продолжает защищать handoff; все целевые suites PASS без запуска чужих задач или модели.

## 3. Managed policy compatibility

- [x] 3.1 Добавить failing portable-installer fixture для точного старого Firstmate блока; подготовить source-only exact-known-block migration и убедиться в PASS: private bytes сохранены, повторный запуск idempotent, неизвестные конфликты и linked AGENTS отвергаются. Не запускать installer над личным runtime; описать ограничения preserve-settings.

## 4. Final integration and evidence

- [x] 4.1 Выполнить обязательный полный npm test на окончательном source scope, strict OpenSpec validation и git diff --check; записать команды, версии, exit codes и ограничения в evidence.md. Не заменять SDK integration строковыми asserts, не заявлять CI/live/fleet PASS без реального запуска.
- [x] 4.2 Просмотреть полный owned diff, включая новые файлы, против исходного состояния, подтвердить сохранность чужих TODO/.pi/tasks/Canary изменений и отсутствие логов/секретов/runtime artifacts; создать commit только source/specs/tests/docs исправления и записать commit/evidence без установки production.

## Workflow follow-up

- После PASS всех apply tasks и ревью синхронизировать specs и архивировать change по workflow; затем проверить архивированный результат.
- Production установка и любые live проверки — только отдельное согласование; наличие source commit не означает исправление уже запущенных сессий.
