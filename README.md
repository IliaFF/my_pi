# my_pi

Воспроизводимая актуальная сборка Pi для рабочего стека IliaFF.

## Зафиксированное состояние

- Pi core `@earendil-works/pi-coding-agent@0.84.1`
- Node.js `>=24.0.0` (требование `pi-fabric@0.50.1`)
- 16 прямых npm dependencies с точными версиями: 15 settings entries и один dormant package; полный `package-lock.json`
- единая default-конфигурация с одним стабильным model-facing tool `fabric_exec`; остальные tools захвачены Fabric
- recovery-aware compaction `recovery-v4-chronological-10k`
- summarizer всегда использует текущую выбранную модель Pi
- deterministic authoritative-state projection, строгая validation и немедленный Pi built-in fallback после первой неудачной попытки
- checksum-verified external excerpts и lazy `context_recall`
- bounded recovery packet как emergency fallback, а не обязательный повтор summary
- precise tool restoration: compacted history восстанавливает только `context_recall` по `ctxref://`
- Contextimate для оценки статического context footprint
- Cachemire для cache/turn cost diagnostics
- persistent агрегированный agent-loop baseline, outer/nested Fabric telemetry и `/loop-report batching`

Репозиторий содержит три version-gated patch для `pi-canary@1.5.0`, `pi-caveman@1.0.8` и `@juicesharp/rpiv-ask-user-question@2.4.0`. Прежний patch `pi-zai-usage` удалён: upstream `1.1.0` включает корректную обработку optional Codex quota windows.

## Текущие packages и расширения

`npm/package.json` фиксирует 16 прямых dependencies. Из них 15 перечислены в `configs/settings.json`; `pi-canary` установлен и patch-tested, но намеренно не загружается. Fabric в full-code mode скрывает schemas captured extension tools от parent model, но сами extensions, slash-команды, event handlers и UI продолжают работать; ленивый вызов доступен внутри `fabric_exec` через `extensions.*` или `tools.search()`.

| Package | Версия | Статус | Для чего нужен |
| --- | ---: | --- | --- |
| `@ff-labs/pi-fff` | `0.10.3` | загружен | Быстрый fuzzy-поиск файлов и содержимого; основной лёгкий finder — `fffind`. |
| `@monotykamary/pi-retry` | `0.6.9` | загружен | Автоматический контролируемый retry для HTTP `400/413`, connection и provider errors. |
| `pi-fabric` | `0.50.1` | загружен, основной executor | Один `fabric_exec` вместо множества schemas; type-checked compound execution через изолированный QuickJS и host bridge. |
| `pi-web-access` | `0.19.0` | загружен, tools lazy | Web search, URL/GitHub/PDF/YouTube retrieval. Network tools захвачены Fabric и не висят отдельными schemas. |
| `@llblab/pi-telegram` | `0.27.2` | загружен, tools lazy | Telegram runtime adapter: сообщения и вложения; используется только по явному запросу. |
| `pi-caveman` | `1.0.8` | загружен, patched | Сокращает verbosity/output tokens без удаления технической сути; patch сохраняет текущую prompt/UI интеграцию. |
| `@juicesharp/rpiv-ask-user-question` | `2.4.0` | загружен, patched | Structured clarification; patch активирует tool до первого turn и сохраняет cache-stable system prefix. |
| `@tunnckocore/pi-gpt-fast-mode` | `0.4.0` | загружен, default off | `/fast` добавляет `service_tier: "priority"` только поддерживаемым GPT-5.4/5.5/5.6; через ChatGPT subscription ускоряет ответы ценой повышенного расхода credits. |
| `pi-token-speed` | `0.7.1` | загружен | Показывает скорость генерации tokens/sec по sliding window. |
| `pi-fast-resume` | `1.4.6` | загружен | Быстрый session picker: читает bounded headers вместо полного разбора session-файлов. |
| `pi-diff-review` | `0.1.26` | загружен | Локальный TUI для просмотра и review Git diff. |
| `@beyona/pi-zai-usage` | `1.1.0` | загружен | Quota/usage footer для OpenAI Codex, Z.ai, OpenCode Go и DeepSeek; upstream обрабатывает optional и Spark quota windows. |
| `pine-of-glass` | `0.10.1` | загружены только 3 extensions | Observability bundle; активны `pi-contextimate`, `pi-traceline`, `pi-cachemire`. |
| `pi-my-setup` | `0.4.12` | установлен как package/CLI helper | Сохраняет и восстанавливает наборы Pi packages и skills; model-facing tool не регистрирует. |
| `pi-markdown-preview` | `0.11.3` | загружен | Render Markdown/LaTeX в terminal/browser/PDF. |
| `pi-canary` | `1.5.0` | **не загружен**, pinned + patched | Hidden context-awareness canary. Отключён, чтобы не добавлять скрытый token/context check каждый turn; остаётся воспроизводимым для будущего отдельного теста. |

### Локальные extensions

| Файл | Статус | Назначение |
| --- | --- | --- |
| `auto-ultra-compact/index.ts` | активен | Следит за threshold, проверяет compactability, запускает continuation и пишет bounded recovery packet только как emergency fallback. |
| `context-compaction.ts` | активен | Одна custom-summary попытка текущей моделью, chronological marker reducer с reopen semantics, deterministic projection canonical marker-state, строгая validation, Pi fallback, external excerpts и `context_recall`. |
| `fabric-output/index.ts` | активен глобально | Сокращает большие native Fabric/Bash artifacts, сохраняя exact path для lazy `pi.read`/`pi.grep`. |
| `loop-profiler.ts` | активен | Хранит bounded агрегаты последних 500 runs; различает outer Fabric/direct calls и nested operations; `/loop-report batching`; raw trace только при `PI_PROFILE=1`. |
| `decision-observer.ts` | активен, project opt-in | Сохраняет только explicit `[DECISION]`/`[VALIDATION]`/`[SUPERSEDED]` markers; `/decisions`, bounded reports и quiet footer без model-facing tools. |
| `reader-pane.ts` | активен, opt-in | Безопасная правая панель Windows Terminal/WSL; последний Markdown, bounded tool images и карточки для широких таблиц без потери текста. |
| `todo-queue/index.ts` | активен | Постоянная очередь в проектном `TODO.md`: `+`, `/queue`, locked atomic writes и проверяемое завершение через `task_queue`. |
| `tools.ts` | активен | Держит стабильный `fabric_exec`, не меняет tools по словам prompt, сохраняет явный `/tools` selection и добавляет только `context_recall` после compaction с `ctxref://`. |

`project-loop.ts`, его auto-preflight, пять schemas и `/fast-fix` удалены: их заменил общий compound runtime Fabric.

### Что отключено и почему

| Компонент | Текущее состояние | Причина |
| --- | --- | --- |
| Fabric `node-process` | выключен; executor `quickjs` | `node-process` не является security boundary; текущие workload помещаются в QuickJS 64 MiB. |
| Fabric compactor | `compaction.engine: "pi"` | Не перехватывает `session_before_compact`; сохраняет `auto-ultra-compact`, custom summarizer, validator, recovery и `/compaction-mode`. |
| Fabric MCP | `enabled: false`, dynamic servers запрещены | Нет обязательного MCP workflow; меньше host-privileged/network surface. Существующие extension tools остаются доступны через capture. |
| Fabric agents/RLM/councils | `enabled: false`, `maxDepth: 0`, agent approval `deny` | Child agents добавляют model calls, стоимость и orchestration complexity; основной bottleneck сейчас — лишние rounds. |
| Fabric mesh и actors | `enabled: false` | Не нужны mailbox, durable actors, resident host и project event log для одиночного coding workflow. |
| Fabric memory | `enabled: false` | Пока дублирует session JSONL, recovery packet, context-store и `context_recall`; включать только отдельным bounded A/B. |
| Fabric schema transactions | `mode: "off"` | Certification protocol полезен для специальных migrations, но создаёт лишний overhead в повседневных edits. |
| Fabric actor UI hooks | `haltOnEscape: false`, agent preview выключен | Actors/agents отключены, поэтому их hotkey и nested-agent rows не нужны. |
| Pi experimental tool-output pruning | выключен | Не мутирует tool history дополнительным экспериментальным pruning; bounded outputs контролируются источником и Fabric limits. |
| `pi-canary` runtime | отсутствует в `settings.json` | Избегаем скрытой per-turn context проверки; exact package и patch сохранены для rollback/эксперимента. |
| Legacy project-loop | удалён | Убирает auto-preflight и пять постоянных schemas; discovery/edit/test объединяются в `fabric_exec`. |
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

Если Pi `0.84.1` уже доступен через `PATH`:

```bash
./install.sh
```

Установщик:

1. Проверяет Node.js, npm, Python, `patch` и `tar`.
2. Проверяет release и exact-version patch replay.
3. Создаёт rollback backup управляемых agent-файлов.
4. Выполняет `npm ci --ignore-scripts --legacy-peer-deps` по lock-файлу.
5. Устанавливает default config, local extensions и UI configs.
6. Применяет совместимые patch и запускает verification.
7. При ошибке восстанавливает backup.

Другой основной agent directory:

```bash
PI_CODING_AGENT_DIR=/path/to/agent ./install.sh
```

После установки авторизуйте provider отдельно и перезапустите Pi.

## Compaction

Default-конфигурация использует:

- `reserveTokens: 12500`
- `keepRecentTokens: 12000`
- hard summary output cap 10k
- custom compaction на текущей выбранной модели Pi
- deterministic projector добавляет active marker-state кодом до строгого validator
- одна custom-попытка, затем немедленный Pi built-in fallback
- external exact excerpts под `~/.pi/agent/context-store/`
- lazy `context_recall`
- compactability guard: высокий provider context сам по себе не запускает `ctx.compact()`, если session history не имеет discardable prefix; это предотвращает `Nothing to compact (session too small)` loop

Guard использует `keepRecentTokens: 12000`; при отдельном изменении этого значения синхронизируйте `PI_AUTO_COMPACT_KEEP_RECENT_TOKENS`. После первого завершённого post-compaction turn watchdog сверяет реальный provider usage: если prompt всё ещё выше порога и есть discardable prefix, повторное сжатие запускается сразу, без трёхходового cooldown.

После auto-compaction validated summary продолжает работу напрямую. Ручной `/compact` остаётся idle и не отправляет continuation prompt. `/clear-context` полностью очищает LLM-контекст без model call и новой сессии; прежняя история остаётся отдельной веткой текущего session-файла. Recovery packet читается только при явной потере state.

Для старого проекта можно сразу пропустить custom summarizer и всегда использовать штатное сжатие Pi:

```text
/compaction-mode builtin
```

Режим сохраняется в `~/.pi/agent/extensions/context-compaction.json`. Возврат: `/compaction-mode custom`. Проверка: `/compaction-mode status`. Default — `custom`.

## Observability

Default-конфигурация включает `pi-contextimate`, `pi-cachemire` и `pi-traceline` из `pine-of-glass@0.10.1`.

`loop-profiler.ts` постоянно хранит только bounded агрегаты последних 500 agent runs в `~/.pi/agent/observability/loop-runs.jsonl` с правами `0600`. Prompt, messages, tool arguments и tool results туда не записываются. Project correlation использует короткий hash пути; raw event trace остаётся opt-in через `PI_PROFILE=1`.

```text
/loop-report last
/loop-report baseline
/loop-report batching
```

Report фильтруется по текущему project path и показывает duration, TTFT, provider response-header latency, model/tool rounds, validation rounds, tool-output size и cache usage. `last` отдельно считает outer `fabric_exec`, direct model-facing calls и nested operations, их durations/errors и operations per Fabric program; legacy records остаются читаемыми. `batching` ведёт before/after pilot: последние 10 legacy и первые 10 policy-labelled non-synthetic runs (`contextChars >= 1000`), показывая progress и помечая сравнение как нерандомизированное. Новое поле `sessionHash` позволяет Decision Observer связать marker с агрегатом без хранения session id.

`configs/APPEND_SYSTEM.md` задаёт soft policy: связанные discovery/edit/test/finalization operations группируются в bounded `fabric_exec`, один model round соответствует новому семантическому решению. Direct tools не блокируются: они остаются fallback для isolated action, Fabric failure, clarification/security boundary или результата, который модель должна осмыслить до следующего шага.

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

## Decision observability

`decision-observer.ts` загружается глобально, но ничего не пишет без project policy `.pi/decision-observability.json` с `enabled: true`. Начальный безопасный шаблон: `configs/decision-observability.example.json`. Policy принимает только `structured-markers`; `captureToolOutput`, `captureMessages` и `capturePrompts` принудительно остаются `false`.

```text
[DECISION] fabric-runtime: Использовать QuickJS вместо node-process.
[VALIDATION] fabric-runtime: RPC PASS, errors=0, commit bc5d975.
[SUPERSEDED] fabric-runtime: Использовать node-process.
```

Сохраняется только payload этих явных markers: максимум 500 записей, 90 дней и 500 символов на marker по default. Secret-like values redacted; absolute paths redacted, пока `capturePaths` не включён явно. Thinking blocks, обычные messages, prompts, tool arguments/results и raw outputs не записываются. Ledger лежит вне Git: `~/.pi/agent/observability/decisions/<project-hash>/ledger.jsonl`, directory `0700`, file `0600`. Status transition детерминирован: `proposed`, `validated`, `failed`, `superseded`, `reverted` или `unknown`; один успешный tool call сам по себе outcome не меняет.

```text
/decisions
/decision-report last|7d|30d|open|failures|all
/decision-show <id|key>
/decision-report 30d --markdown
```

`/decisions` открывает split-pane terminal dashboard в заметной theme-aware рамке: arrows/PageUp/PageDown, `Enter` detail, `a/o/x` status filter, `1/7/0/*` period, `/` search, `r` refresh, `e` explicit Markdown export. RPC/headless получает bounded text report вместо TUI. Footer `D ✓/✗/?` появляется только в TUI у opted-in project. Extension не регистрирует model-facing tools, не вызывает модель, не запускает background review и не подписывается на Fabric/compaction hooks.

## Compound project workflow

`pi-fabric@0.50.1` заменяет прежний `project-loop.ts` и его пять model-facing schemas одним `fabric_exec`. В default full-code mode нативные file/shell tools и extension tools доступны внутри type-checked TypeScript через `pi.*` и `extensions.*`; независимые и зависимые операции выполняются без промежуточного model round-trip.

Безопасный reproducible профиль хранится в `configs/fabric.json` и устанавливается как `~/.pi/agent/fabric.json`:

- isolated QuickJS; `node-process` не используется;
- Fabric compactor отключён через `compaction.engine: "pi"`, поэтому существующие `auto-ultra-compact` и `context-compaction.ts` сохраняют lifecycle;
- MCP, built-in agents, mesh, memory и schema transactions выключены;
- captured extension tools скрыты из model schemas, но их commands, handlers, UI и lazy invocation сохраняются;
- `fabric_exec` остаётся единственным model-facing tool по default; keyword routing удалён для стабильного prefix cache;
- Fabric agent risk запрещён; обычные read/write/execute и существующие network extensions сохраняют текущую политику.

Для coding tasks модель должна объединять discovery, exact edits и validation в один `fabric_exec`, когда промежуточный результат не требует отдельного model reasoning. Возвращать следует bounded итог и evidence, не полные логи.

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

`pi update --self` может заменить Pi core. Репозиторий фиксирует `0.84.1`; обновление core нужно сначала проверить и зафиксировать здесь.

## Откат

```bash
./uninstall.sh --dry-run
./uninstall.sh
```

Откат восстанавливает agent configs из backup перед установкой. Pi core автоматически не понижается.

## Структура

- `npm/` — exact dependency set и lock
- `configs/` — default configs без секретов, включая safe `fabric.json`
- `local-extensions/` — compaction, tool routing и profiler
- `patches/` — exact-version diffs
- `scripts/maintenance.py` — snapshot, backup, patch, restore и verify
- `scripts/update-safe.sh` — контролируемое обновление
- `scripts/test-release.py` — release/security/patch replay
- `manifest.json` — машинно-читаемая topology сборки
