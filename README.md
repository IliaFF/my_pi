# my_pi

Воспроизводимая актуальная сборка Pi для рабочего стека IliaFF.

## Зафиксированное состояние

- Pi core `@earendil-works/pi-coding-agent@0.83.0`
- Node.js `>=22.19.0` (рабочий хост: Node.js 24)
- 14 прямых расширений с точными версиями и полный `package-lock.json`
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

## Быстрый project loop

`project-loop.ts` без model call строит bounded auto-preflight перед первым request каждой задачи и вставляет его ephemeral-сообщением после последнего user prompt. Старые preflight не накапливаются в model context и не меняют стабильный system-prompt prefix.

Инструменты:

- `project_context` — ranked paths/content и profile excerpts;
- `project_probe` — stack, git state, top-level map и task hints одним вызовом;
- `edit_verify` — exact edit одного файла плюс targeted validation;
- `targeted_test` — один profile-first validation workflow;
- `finish_gate` — финальные проверки до завершения;
- `/fast-fix <задача>` — запускает low-round-trip workflow.

Project profile необязателен: `<project>/.pi/project-loop.json`. Schema: `configs/project-loop.schema.json`; example: `configs/project-loop.example.json`. Profile выполняется только для trusted project. При отсутствии profile autodetect не скачивает зависимости и ограничен `git diff --check`, local syntax checks и уже установленным `node_modules/.bin/tsc`.

```json
{
  "version": 1,
  "context": { "files": ["README.md", "TODO.md"], "maxChars": 5000 },
  "validation": {
    "targeted": { "unit": { "command": "npm test", "timeoutMs": 120000 } },
    "finish": [{ "name": "verify", "command": "./scripts/verify.sh", "timeoutMs": 180000 }]
  }
}
```

Все auto/tool outputs bounded; repository map и полные logs в context не выгружаются.

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
- `configs/` — default configs без секретов
- `local-extensions/` — compaction, tool routing и profiler
- `patches/` — exact-version diffs
- `scripts/maintenance.py` — snapshot, backup, patch, restore и verify
- `scripts/update-safe.sh` — контролируемое обновление
- `scripts/test-release.py` — release/security/patch replay
- `manifest.json` — машинно-читаемая topology сборки
