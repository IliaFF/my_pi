# my_pi

Воспроизводимая актуальная сборка Pi для рабочего стека IliaFF.

## Зафиксированное состояние

- Pi core `@earendil-works/pi-coding-agent@0.83.0`
- Node.js `>=24.0.0` (требование `pi-fabric@0.40.3`)
- 15 прямых расширений с точными версиями и полный `package-lock.json`
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
