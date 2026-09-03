# my_pi

Воспроизводимая актуальная сборка Pi для рабочего стека IliaFF.

## Зафиксированное состояние

- Pi core `@earendil-works/pi-coding-agent@0.84.4`
- Node.js `>=24.0.0`
- 21 прямая npm dependency с точными версиями: 17 settings entries, один dormant package и exact runtime peers; полный `package-lock.json`
- direct-only default-конфигурация: `read`, `grep`, `find`, `edit`, `write` и `bash` доступны модели напрямую; Fabric отсутствует
- детерминированное сжатие `context-fold@0.4.0` без model call и пересказа
- обратимые `{#code FOLDED}` pointers с SHA-256 и `recall_folded` по append-only session ledger
- bounded recovery packet `auto-ultra-compact` как emergency fallback
- precise tool restoration после compaction добавляет `recall_folded` при наличии folded pointers
- Contextimate для оценки статического context footprint
- Cachemire для cache/turn cost diagnostics
- persistent агрегированный agent-loop baseline, direct context-output и searchable-context receipt telemetry v4, `/loop-report batching`
- глобальный OpenAlex skill с dependency-free Node helper для поиска научных публикаций и OA-ссылок

Репозиторий содержит три version-gated patch для `pi-canary@1.5.0`, `pi-caveman@1.0.8` и `@juicesharp/rpiv-ask-user-question@2.9.0`. Прежний patch `pi-zai-usage` удалён: upstream `1.1.0` включает корректную обработку optional Codex quota windows.

## Текущие packages и расширения

`npm/package.json` фиксирует 21 прямую dependency. В `configs/settings.json` перечислены 17 Pi packages; `pi-canary` установлен и patch-tested, но намеренно не загружается. `typebox`, `@earendil-works/pi-coding-agent` и `@earendil-works/pi-tui` закреплены на версиях `1.3.25`/`0.84.4`/`0.84.4` как runtime peers для standalone загрузки `pi-context`. Model-facing coding surface остаётся прямым и проверяемым без wrapper executor.

| Package | Версия | Статус | Для чего нужен |
| --- | ---: | --- | --- |
| `@ff-labs/pi-fff` | `0.10.6` | загружен | Быстрый fuzzy-поиск файлов и содержимого; основной лёгкий finder — `fffind`. |
| `@monotykamary/pi-retry` | `0.8.3` | загружен | Автоматический контролируемый retry для HTTP `400/413`, connection и provider errors. |
| `@spences10/pi-context` | `0.1.16` | загружен | Индексирует большие redacted tool outputs в SQLite FTS5 и даёт `context_search/get/export/list/stats/purge`. |
| `context-fold` | `0.4.0` | загружен | Детерминированно сворачивает старые tool/thinking blocks, заменяет hard compaction verbatim-индексом и восстанавливает детали через `recall_folded`. |
| `pi-web-access` | `0.27.0` | загружен | Web search, URL/GitHub/PDF/YouTube retrieval; tools доступны напрямую по active-tool policy. |
| `@llblab/pi-telegram` | `0.42.2` | загружен, tools lazy | Telegram runtime adapter: сообщения и вложения; используется только по явному запросу. |
| `pi-caveman` | `1.0.8` | загружен, patched | Сокращает verbosity/output tokens без удаления технической сути; patch сохраняет текущую prompt/UI интеграцию. |
| `@dietrichgebert/ponytail` | `4.9.0` | загружен глобально | Минимальный coding workflow: YAGNI, stdlib/native first, короткий рабочий diff. |
| `@juicesharp/rpiv-ask-user-question` | `2.9.0` | загружен, patched | Structured clarification; patch активирует tool до первого turn и сохраняет cache-stable system prefix. |
| `@tunnckocore/pi-gpt-fast-mode` | `0.4.0` | загружен, default off | `/fast` добавляет `service_tier: "priority"` только поддерживаемым GPT-5.4/5.5/5.6; через ChatGPT subscription ускоряет ответы ценой повышенного расхода credits. |
| `pi-token-speed` | `0.8.0` | загружен | Показывает скорость генерации tokens/sec по sliding window. |
| `pi-fast-resume` | `1.4.9` | загружен | Быстрый session picker: читает bounded headers вместо полного разбора session-файлов. |
| `pi-diff-review` | `0.1.26` | загружен | Локальный TUI для просмотра и review Git diff. |
| `@beyona/pi-zai-usage` | `1.1.0` | загружен | Quota/usage footer для OpenAI Codex, Z.ai, OpenCode Go и DeepSeek; upstream обрабатывает optional и Spark quota windows. |
| `pine-of-glass` | `0.10.2` | загружены только 3 extensions | Observability bundle; активны `pi-contextimate`, `pi-traceline`, `pi-cachemire`. |
| `pi-my-setup` | `0.4.12` | установлен как package/CLI helper | Сохраняет и восстанавливает наборы Pi packages и skills; model-facing tool не регистрирует. |
| `pi-markdown-preview` | `0.16.0` | загружен | Render Markdown/LaTeX в terminal/browser/PDF. |
| `pi-canary` | `1.5.0` | **не загружен**, pinned + patched | Hidden context-awareness canary. Отключён, чтобы не добавлять скрытый token/context check каждый turn; остаётся воспроизводимым для будущего отдельного теста. |

### Локальные extensions

| Файл | Статус | Назначение |
| --- | --- | --- |
| `auto-ultra-compact/index.ts` | активен | Следит за threshold, проверяет compactability, запускает continuation и пишет bounded recovery packet только как emergency fallback. |
| `loop-profiler.ts` | активен | Хранит bounded агрегаты последних 500 runs; считает direct context output, `pi-context` receipts и errors; читает legacy v1/v2/v3 records; raw trace только при `PI_PROFILE=1`. |
| `reader-pane.ts` | активен, opt-in | Безопасная правая панель Windows Terminal/WSL; последний Markdown, bounded tool images и карточки для широких таблиц без потери текста. |
| `todo-queue/index.ts` | активен | Постоянная очередь в проектном `TODO.md`: `+`, `/queue`, locked atomic writes и проверяемое завершение через `task_queue`. |
| `tools.ts` | активен | Держит стабильными direct coding tools и шесть `context_*` retrieval/maintenance tools, не меняет surface по словам prompt, сохраняет явный `/tools` selection; после compaction добавляет `recall_folded` при `{#code FOLDED}`. |

`project-loop.ts`, его auto-preflight, пять schemas и `/fast-fix` удалены: coding flow выполняется последовательными или параллельными direct tool calls.

### OpenAlex skill

`skills/openalex/` устанавливается глобально в `~/.pi/agent/skills/openalex/`. Skill выполняет bounded-поиск OpenAlex, exact DOI lookup, year/OA filtering и передаёт найденные законные full-text ссылки в `pi-web-access`; helper использует только Node.js stdlib.

### Что отключено и почему

| Компонент | Текущее состояние | Причина |
| --- | --- | --- |
| Fabric runtime | полностью удалён | Full-code mode скрывал direct schemas, добавлял latency и orchestration complexity без экономии model calls. |
| Локальный `output-compactor` | полностью удалён | Заменён готовым searchable sidecar `@spences10/pi-context@0.1.16`; оба `tool_result` interceptor одновременно не загружаются. |
| Локальный `context-compaction.ts` | полностью удалён | Заменён `context-fold@0.4.0`: без model summarizer, external excerpt store и второго compaction-owner. |
| Pi experimental tool-output pruning | выключен | Не мутирует историю lossy pruning; большие результаты обрабатывает searchable context sidecar. |
| `pi-canary` runtime | отсутствует в `settings.json` | Избегаем скрытой per-turn context проверки; exact package и patch сохранены для rollback/эксперимента. |
| Legacy project-loop | удалён | Убирает auto-preflight и пять постоянных schemas; discovery/edit/test остаётся direct. |
| Legacy keyword tool router и `lean-tools.ts` | удалены | Они вызывали `setActiveTools()` на turn boundaries; web `promptSnippet` пересобирал system prompt и ломал prefix cache. |

## Что намеренно исключено

Репозиторий не содержит:

- `auth.json`, API keys, токены или npm credentials
- sessions, recovery packets, context-store и логи
- npm cache и установленное `node_modules`
- runtime-состояние Telegram, Intercom и Pi Studio
- project-specific конфиги
- абсолютные host-specific пути

Авторизацию провайдера нужно создать отдельно; `auth.json` не публикуется.

## Предварительная проверка

```bash
git clone https://github.com/IliaFF/my_pi.git
cd my_pi
./install.sh --dry-run --install-core
```

Dry-run не меняет хост. Он проверяет lock, конфиги, отсутствие известных секретных/runtime-путей и replay всех patch на pristine npm archives.

## Установка

На чистом хосте:

```bash
./install.sh --install-core
```

Если Pi `0.84.4` уже доступен через `PATH`:

```bash
./install.sh
```

Установщик:

1. Проверяет Node.js, npm, Python, `patch` и `tar`.
2. Проверяет release и exact-version patch replay.
3. Создаёт rollback backup управляемых agent-файлов.
4. Выполняет `npm ci --ignore-scripts --legacy-peer-deps` по lock-файлу.
5. Устанавливает default config, local extensions, OpenAlex skill и UI configs.
6. Применяет совместимые patch и запускает verification.
7. При ошибке восстанавливает backup.

Другой основной agent directory:

```bash
PI_CODING_AGENT_DIR=/path/to/agent ./install.sh
```

После установки авторизуйте provider отдельно и перезапустите Pi.

## Compaction

`context-fold@0.4.0` — единственный owner `session_before_compact`. Default `CONTEXTFOLD_COMPACT=det` заменяет LLM-summary детерминированным verbatim seed index. Raw history остаётся в append-only session JSONL; `{#code FOLDED}` восстанавливается через `recall_folded` с проверкой SHA-256.

Fold ladder начинает сворачивать stale `tool_result` и `thinking` blocks при 45% context window; user intent, assistant conclusions, tool calls и свежий tail не сворачиваются. Обычный fold требует экономию минимум 12% окна. Несжимаемый tail/roots остаётся честно обозначенным floor.

Pi-конфигурация сохраняет `reserveTokens: 12500` и `keepRecentTokens: 12000`. `auto-ultra-compact` проверяет compactability, запускает threshold compaction и post-compaction usage check; recovery packet используется только как emergency fallback. Ручной `/compact` остаётся без automatic continuation.

Настройка и статус:

```text
/context-fold
/context-fold config
```

## Observability

Default-конфигурация включает `pi-contextimate`, `pi-cachemire` и `pi-traceline` из `pine-of-glass@0.10.2`.

`loop-profiler.ts` постоянно хранит только bounded агрегаты последних 500 agent runs в `~/.pi/agent/observability/loop-runs.jsonl`: каталог создаётся с правами `0700`, файл — `0600`. Prompt, messages, tool arguments, tool results, call IDs и секреты туда не записываются; сохраняются только числовые counters/histograms. Project correlation использует короткий hash пути; raw event trace остаётся opt-in через `PI_PROFILE=1`.

```text
/loop-report last
/loop-report baseline
/loop-report batching
```

Report фильтруется по текущему project path и показывает duration, TTFT, provider response-header latency, model/tool rounds, validation rounds и cache usage. Telemetry v4 считает текстовые chars и image blocks direct results, реально входящих в model context, а также число распознанных `pi-context` receipts. Source IDs, paths, prompt, raw output и arguments не записываются. Старые v1/v2/v3 records и legacy Fabric/output-compactor aggregates остаются читаемыми; новые runs помечаются `searchable-context-v4`.

`configs/APPEND_SYSTEM.md` задаёт direct-only policy. Одиночные операции и обычный `search → read → edit → test` идут direct; 2–4 статически известных независимых операции можно запускать параллельными direct calls. Для больших результатов сначала используются `context_search` и bounded `context_get`; для полного анализа redacted source — `context_export` и затем `rg`/`jq`/Python.

## Windows Terminal visual

Переносимый visual snapshot лежит в `windows-terminal/`: sanitized `settings.json`, Catppuccin Mocha background и короткая инструкция. Username, absolute host paths и machine-specific profiles исключены. Требуется JetBrainsMono Nerd Font; подробности — `windows-terminal/README.md`.

## Reader pane

Опциональная команда `/reader-pane-on` открывает безопасную правую панель Windows Terminal из Pi, запущенного внутри WSL. Панель автоматически показывает последний завершённый Markdown-ответ через `mdcat` с темой Catppuccin. Широкие таблицы преобразуются только в preview-копии в вертикальные карточки без обрезания ячеек; исходная история Pi, узкие таблицы и таблицы внутри fenced code blocks не меняются.

Панель не исполняет текст ответа, удаляет terminal control bytes, блокирует внешние Markdown-изображения и принимает только bounded PNG/JPEG/WebP из фактических `toolResult` image-блоков. Требуются Windows Terminal и `mdcat.exe` в `%USERPROFILE%\\scoop\\shims`. Управление:

```text
/reader-pane-on
/reader-pane-status
/reader-pane-off
```

## Searchable context sidecar

`@spences10/pi-context@0.1.16` перехватывает большие текстовые `tool_result` без model calls, redacts известные секреты, lossless-разбивает текст примерно по 4096 bytes и индексирует chunks в SQLite FTS5 (`~/.pi/agent/context.db`). Generic threshold — `24576` bytes или `300` строк, MCP threshold — `51200` bytes или `2000` строк. В model context остаётся receipt с preview и инструкциями. Полный сохранённый **redacted** source восстанавливается через `context_export`; focused retrieval — через `context_search` и `context_get`.

Воспроизводимая policy лежит в `configs/pi-context.json`: preset `balanced`, 7 дней и logical source cap 250 MiB. Это не физический hard cap SQLite/WAL, а cleanup policy, которая не запускается после каждой записи. Installer сливает policy в `~/.pi/agent/my-pi-settings.json` (`packages.context`), не затрагивая settings других packages, создаёт `context.db` с mode `0600` и включает весь settings-файл в rollback backup. Managed exports создаются с `0700/0600`.

Известные ограничения upstream `0.1.16`: tool input summary хранится без redaction; lowered custom generic threshold всё равно ограничен предварительным default gate 24 KiB; `context_search` с известным `source_id` может вернуть metadata/snippet другого scope, хотя `context_get` scope соблюдает; mixed text+image capture заменяет весь result текстовым receipt и теряет image block. Поэтому не передавайте секреты в tool arguments, не используйте `global:true` без необходимости и не считайте sidecar security boundary для недоверенных локальных пользователей. Старые `~/.pi/agent/output-artifacts/` installer не удаляет, но локальный `output-compactor` больше не загружается.

## Проверка установленного стека

```bash
~/.pi/agent/maintenance/scripts/verify.sh
```

Проверка release с чистым patch replay:

```bash
python3 scripts/test-release.py
```

Smoke startup:

```bash
timeout 20 pi --mode rpc --no-session </dev/null
```

## Безопасное обновление расширений

Сначала:

```bash
~/.pi/agent/maintenance/scripts/update-safe.sh --dry-run
```

Затем:

```bash
~/.pi/agent/maintenance/scripts/update-safe.sh
```

Update script создаёт backup npm tree, обновляет расширения, возвращает managed configs, повторно применяет совместимые patch и проверяет результат. Неизвестная версия patch-пакета вызывает отказ и rollback.

`pi update --self` может заменить Pi core. Репозиторий фиксирует `0.84.4`; обновление core нужно сначала проверить и зафиксировать здесь.

## Откат

```bash
./uninstall.sh --dry-run
./uninstall.sh
```

Откат восстанавливает agent configs из backup перед установкой. Pi core автоматически не понижается.

## Структура

- `npm/` — exact dependency set и lock
- `configs/` — default configs без секретов, включая balanced `pi-context.json`
- `local-extensions/` — compaction, tool routing и profiler
- `skills/openalex/` — OpenAlex workflow и dependency-free helper
- `patches/` — exact-version diffs
- `scripts/maintenance.py` — snapshot, backup, patch, restore и verify
- `scripts/update-safe.sh` — контролируемое обновление
- `scripts/test-release.py` — release/security/patch replay
- `manifest.json` — машинно-читаемая topology сборки
