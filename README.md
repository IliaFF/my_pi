# my_pi

Воспроизводимая актуальная сборка Pi для рабочего стека IliaFF.

## Зафиксированное состояние

- Pi core `@earendil-works/pi-coding-agent@0.83.0`
- Node.js `>=24.0.0` (требование `pi-fabric@0.40.3`)
- 15 прямых npm dependencies с точными версиями: 14 settings entries и один dormant package; полный `package-lock.json`
- единая default-конфигурация с нативными file tools, `fffind`, lazy web/Telegram и structured clarification
- recovery-aware compaction `recovery-v2-10k`
- summarizer всегда использует текущую выбранную модель Pi
- deterministic validation и немедленный Pi built-in fallback после первой неудачной попытки
- checksum-verified external excerpts и lazy `context_recall`
- bounded recovery packet как emergency fallback, а не обязательный повтор summary
- precise tool restoration: compacted history восстанавливает только `context_recall` по `ctxref://`
- Contextimate для оценки статического context footprint
- Cachemire для cache/turn cost diagnostics
- persistent агрегированный agent-loop baseline и `/loop-report`

Репозиторий содержит три version-gated patch для `@beyona/pi-zai-usage@0.4.0`, `pi-canary@1.4.0` и `pi-caveman@1.0.7`.

## Текущие packages и расширения

`npm/package.json` фиксирует 15 прямых dependencies. Из них 14 перечислены в `configs/settings.json`; `pi-canary` установлен и patch-tested, но намеренно не загружается. Fabric в full-code mode скрывает schemas captured extension tools от parent model, но сами extensions, slash-команды, event handlers и UI продолжают работать; ленивый вызов доступен внутри `fabric_exec` через `extensions.*` или `tools.search()`.

| Package | Версия | Статус | Для чего нужен |
| --- | ---: | --- | --- |
| `@ff-labs/pi-fff` | `0.10.1` | загружен | Быстрый fuzzy-поиск файлов и содержимого; основной лёгкий finder — `fffind`. |
| `@monotykamary/pi-retry` | `0.6.8` | загружен | Автоматический контролируемый retry для HTTP `400/413`, connection и provider errors. |
| `pi-fabric` | `0.40.3` | загружен, основной executor | Один `fabric_exec` вместо множества schemas; type-checked compound execution через изолированный QuickJS и host bridge. |
| `pi-web-access` | `0.17.0` | загружен, tools lazy | Web search, URL/GitHub/PDF/YouTube retrieval. Network tools захвачены Fabric и не висят отдельными schemas. |
| `@llblab/pi-telegram` | `0.23.1` | загружен, tools lazy | Telegram runtime adapter: сообщения и вложения; используется только по явному запросу. |
| `pi-caveman` | `1.0.7` | загружен, patched | Сокращает verbosity/output tokens без удаления технической сути; patch сохраняет текущую prompt/UI интеграцию. |
| `@juicesharp/rpiv-ask-user-question` | `2.2.0` | загружен, tool lazy | Structured clarification с typed options вместо угадывания существенных решений. |
| `pi-token-speed` | `0.7.1` | загружен | Показывает скорость генерации tokens/sec по sliding window. |
| `pi-fast-resume` | `1.4.4` | загружен | Быстрый session picker: читает bounded headers вместо полного разбора session-файлов. |
| `pi-diff-review` | `0.1.26` | загружен | Локальный TUI для просмотра и review Git diff. |
| `@beyona/pi-zai-usage` | `0.4.0` | загружен, patched | Quota/usage footer для OpenAI Codex, Z.ai и DeepSeek; patch сохраняет корректную обработку доступных quota windows. |
| `pine-of-glass` | `0.6.2` | загружены только 3 extensions | Observability bundle; активны `pi-contextimate`, `pi-traceline`, `pi-cachemire`. |
| `pi-my-setup` | `0.4.12` | установлен как package/CLI helper | Сохраняет и восстанавливает наборы Pi packages и skills; model-facing tool не регистрирует. |
| `pi-markdown-preview` | `0.10.1` | загружен | Render Markdown/LaTeX в terminal/browser/PDF. |
| `pi-canary` | `1.4.0` | **не загружен**, pinned + patched | Hidden context-awareness canary. Отключён, чтобы не добавлять скрытый token/context check каждый turn; остаётся воспроизводимым для будущего отдельного теста. |

### Локальные extensions

| Файл | Статус | Назначение |
| --- | --- | --- |
| `auto-ultra-compact/index.ts` | активен | Следит за threshold, проверяет compactability, запускает continuation и пишет bounded recovery packet только как emergency fallback. |
| `context-compaction.ts` | активен | Одна custom-summary попытка текущей моделью, deterministic validation, Pi fallback, external excerpts и `context_recall`. |
| `loop-profiler.ts` | активен | Хранит только bounded агрегаты последних 500 runs; `/loop-report`; raw trace только при `PI_PROFILE=1`. |
| `tools.ts` | активен | Держит `fabric_exec` core-active, сохраняет tool selection и точное восстановление `context_recall` после compaction. |
| `lean-tools.ts` | активен | Убирает дублирующие/noisy `ffgrep`, `readSeek_search`, `readSeek_rename`, `readSeek_hover`; `fffind`, `readSeek_grep`, `readSeek_refs`, `readSeek_def` остаются доступны. |

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

Если Pi `0.83.0` уже доступен через `PATH`:

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
- `keepRecentTokens: 24000`
- hard summary output cap 10k
- custom compaction на текущей выбранной модели Pi
- deterministic validator
- одна custom-попытка, затем немедленный Pi built-in fallback
- external exact excerpts под `~/.pi/agent/context-store/`
- lazy `context_recall`
- compactability guard: высокий provider context сам по себе не запускает `ctx.compact()`, если session history не имеет discardable prefix; это предотвращает `Nothing to compact (session too small)` loop

Guard использует `keepRecentTokens: 24000`; при отдельном изменении этого значения синхронизируйте `PI_AUTO_COMPACT_KEEP_RECENT_TOKENS`.

После auto-compaction validated summary продолжает работу напрямую. Ручной `/compact` остаётся idle и не отправляет continuation prompt. `/clear-context` полностью очищает LLM-контекст без model call и новой сессии; прежняя история остаётся отдельной веткой текущего session-файла. Recovery packet читается только при явной потере state.

Для старого проекта можно сразу пропустить custom summarizer и всегда использовать штатное сжатие Pi:

```text
/compaction-mode builtin
```

Режим сохраняется в `~/.pi/agent/extensions/context-compaction.json`. Возврат: `/compaction-mode custom`. Проверка: `/compaction-mode status`. Default — `custom`.

## Observability

Default-конфигурация включает `pi-contextimate`, `pi-cachemire` и `pi-traceline` из `pine-of-glass@0.6.2`.

`loop-profiler.ts` постоянно хранит только bounded агрегаты последних 500 agent runs в `~/.pi/agent/observability/loop-runs.jsonl` с правами `0600`. Prompt, messages, tool arguments и tool results туда не записываются. Project correlation использует короткий hash пути; raw event trace остаётся opt-in через `PI_PROFILE=1`.

```text
/loop-report last
/loop-report baseline
```

Report фильтруется по текущему project path и показывает duration, TTFT, provider response-header latency, model/tool rounds, single/parallel batches, validation rounds, tool-output size, cache usage и частые tool transitions.

## Compound project workflow

`pi-fabric@0.40.3` заменяет прежний `project-loop.ts` и его пять model-facing schemas одним `fabric_exec`. В default full-code mode нативные file/shell tools и extension tools доступны внутри type-checked TypeScript через `pi.*` и `extensions.*`; независимые и зависимые операции выполняются без промежуточного model round-trip.

Безопасный reproducible профиль хранится в `configs/fabric.json` и устанавливается как `~/.pi/agent/fabric.json`:

- isolated QuickJS; `node-process` не используется;
- Fabric compactor отключён через `compaction.engine: "pi"`, поэтому существующие `auto-ultra-compact` и `context-compaction.ts` сохраняют lifecycle;
- MCP, built-in agents, mesh, memory и schema transactions выключены;
- captured extension tools скрыты из model schemas, но их commands, handlers, UI и lazy invocation сохраняются;
- `fabric_exec` остаётся core-active в локальном tool selector;
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

`pi update --self` может заменить Pi core. Репозиторий фиксирует `0.83.0`; обновление core нужно сначала проверить и зафиксировать здесь.

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
