# Проверки baseline — 2026-10-15

## Что поймано до завершения

1. Старый maintenance source закреплял core/pi-tui 1.0.0, активный глобальный Pi — 1.2.0. На fresh core 1.0.0 SDK integration упала: `'unknown' !== 'user'` (event.messageType ещё отсутствовал). В source закреплены согласованные core/pi-tui 1.2.0; production не изменён.
2. Portable APPEND_SYSTEM policy уже изменилась, а release assertion требовал `Use direct tools by default`. Тест согласован с действующей portable policy, не возвращена устаревшая инструкция.
3. В новом smoke первоначально было неверное имя `compact-status`; реальный API имеет `auto-ultra-compact-status`. Исправлен тест, не runtime.
4. Read-only runtime gate обнаружил 12 несовпадений direct versions. 10 extension versions перенесены из установленного runtime в exact lock; два SDK peers приведены к активному ядру 1.2.0. Не копировались пользовательские configs, sessions, credentials или node_modules.
5. Stock RPIV 2.13.8 упал на существующей регрессии: `RPIV must remove unusable tool before first turn`. Однострочный session_start patch перенесён с 2.12.0 на 2.13.8. После применения fresh patch этот тест прошёл; upstream archive/reverse replay также прошли.

## Passing проверки

- Fresh `npm ci --ignore-scripts --legacy-peer-deps` по итоговому runtime lock: успешно; 23 direct dependencies, 470 total lock entries. Tooling OpenSpec 1.14.0 закреплён отдельным root lock. Зависимости ставились в новые временные каталоги на Linux filesystem и подключались через игнорируемые symlinks, не брались из production.
- `npm test`: exit 0, **12 этапов PASS** (OpenSpec, CI YAML, harness/rollback/update-gate unit, portable release, loop pilot, patch apply/verify, stack surface, train agents, real loop SDK, context runtime, real RPC startup).
- Python self/rollback/update-gate tests: **15 tests, OK**; queue Node tests **15/15**; reader Node tests **9/9**. Отдельные assert-based compaction/profiler/SDK проверки не включаются в эти числа.
- Негативные проверки: nonzero subprocess не считается PASS; deadline возвращает exit 124 и убивает process group; отсутствующий executable — exit 127; invalid OpenSpec rejected; Node network guard отклоняет fetch/https; повреждённые payload/archive и unmanaged destination отклоняются до записи.
- Real update-safe shell + fake maintenance/Pi: preflight failure не вызывает backup/update; failing post-update integration запускает restore и повторный полный gate; failed restore сообщает ROLLBACK FAIL; dry-run не меняет runtime. Live update/rollback production не запускались.
- Real Pi SDK compact + context-fold 0.7.0 + auto-ultra-compact: оба порядка загрузки, один summary owner, запись compaction сохранена, isCompacting=false, **0 model/auth calls**. Ранее новая регрессия со старым auto source завершалась exit 1 на конкурирующем handler. Скорость synthetic fixture не доказывает скорость пользовательской истории.
- `PATH=<locked npm bin> PI_CODING_AGENT_DIR=<source> python3 scripts/test-release.py <source>`: exit 0; pristine registry archive replay + reverse dry-run для Caveman 1.0.8, RPIV 2.13.8, train-agents 0.2.7; portable source scan PASS.
- `bash -n install.sh uninstall.sh scripts/update-safe.sh scripts/verify.sh`: exit 0.
- CI YAML parsed; проверены locked install, тот же `npm test`, `permissions: contents: read`, artifacts с `if: always()`. Реальный remote job **не запускался**.

## Production остаётся отдельно

Read-only `npm test -- --agent ~/.pi/agent`: exit 1, SDK peers core/pi-tui всё ещё 1.0.0 вместо source 1.2.0. Это отдельные npm peers, глобальный активный CLI имеет версию 1.2.0.

`npm run verify:host`: exit 1, **2 failures / 3 warnings**: RPIV 2.13.8 patch=pending; managed loop-profiler source/runtime drift. Audit-only settings/mcp/APPEND_SYSTEM отличаются и не перезаписывались.

Установка нового source baseline в production требует отдельного согласованного действия с backup. Эта миграция не скрывает ошибки действующего runtime.

## Границы

- Нет платных запросов, live Telegram/Chrome/SSH, интерактивного вопросника и провайдерной авторизации.
- RPC startup и SDK integration не сертифицируют весь возможный interacting tool loop. First-turn RPIV guard проверен на fake UI host; реальный CLI startup проверен отдельно.
- Node network guard не заменяет OS sandbox для native code/подпроцессов.
- Upstream context-fold при собственной ошибке может использовать fallback Pi summary; успешный deterministic path проверен без модели, error fallback здесь не изменён.
- Root fresh_pi AGENTS.md указывает на versioned pi-build/AGENTS.md; остальные проекты fresh_pi не мигрированы. Parent TODO.md остаётся очередью данной миграции.
- Remote/push и реальный CI job не выполнялись. Git baseline фиксирует source; он не является production backup.
