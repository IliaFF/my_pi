# Версионируемая сборка Pi

**Источник истины — этот Git-репозиторий `pi-build/`.** OpenSpec фиксирует поведение и причины изменений; Git восстанавливает source; backup восстанавливает runtime. Ни один из этих механизмов не заменяет тесты.

## Подготовка и единый gate

Node >=24, npm, Python 3.12+, Git и `patch`, Linux/WSL:

```bash
cd pi-build
npm ci --ignore-scripts --no-audit --no-fund
npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund --prefix npm
npm test
```

`npm test`: строгая OpenSpec validation; portable release/unit (queue, reader, compaction, profiler); self-tests runner и backup/restore; реальные Pi SDK integration; применение/проверка patches; настоящий RPC startup configured stack. Личные credentials и sessions не используются. `test-results/results.json` и отдельные логи содержат стадии, exit codes, версии и Git revision. В Git не включаются. Все subprocess ограничены deadline.

`.github/workflows/test.yml` вызывает тот же gate на push/pull_request и сохраняет artifacts даже при ошибке. Hosted CI подтверждён: [GitHub Actions run 38652731907](https://github.com/IliaFF/my_pi/actions/runs/38652731907), main SHA 1b9b4b3, conclusion success, test-results artifact сохранён. Публикация в main выполнена по явному указанию пользователя. В последующем change align-latest-stable-runtime отдельно согласована и выполнена установка latest stable: source/host gate PASS, личные настройки сохранены, текущему процессу нужен restart.

## Как менять сборку

Запускать Pi из этого каталога: здесь сгенерированы `.pi/skills` и `.pi/prompts` для OpenSpec.

1. Прочитать `AGENTS.md` и затронутые `openspec/specs/*/spec.md`.
2. `/opsx-propose` → proposal/specs/design/tasks до редактирования кода. CLI: `npx --no-install openspec new change <name>`.
3. Для бага сначала failing regression; для изменения версии — обновить exact lock, manifest, installer, affected contracts и тесты.
4. `/opsx-apply` → `npm test` → review полного diff → запись результатов и ограничений.
5. `/opsx-archive` только после PASS и завершения tasks; commit specs/code/tests вместе. Не писать, что CI прошёл, без реального job.

## Установленный runtime

```bash
npm test -- --agent "$HOME/.pi/agent"  # реальные dependencies + drift, без их изменения
npm run verify:host                  # только patches/snapshots integrity
```

Новый source закрепляет Pi core/pi-tui **1.2.0**, совпадающий с фактически активным ядром. Прежний maintenance snapshot закреплял 1.0.0. Активный runtime может иметь и другой drift; gate обязан его показать, не скрывать. Production применяется отдельно через проверенный installer с backup; update-safe теперь вызывает полный gate и проверяет rollback тем же набором.

Ponytail 5.2.0 имеет versioned patch: в lite/full/ultra базовые правила включены один раз, а базовый skill скрыт только из автоматического списка текущего запроса. При off и без расширения он снова доступен; `/skill:ponytail`, review/audit aliases и остальные skills сохраняются. Review/audit следуют языку сессии. Эти контракты проверяются настоящим SDK с faux provider в обязательном gate. Обновление source не устанавливает патч в личный или проектный runtime автоматически.

Диагностика и откат: [docs/diagnostics-and-rollback.md](docs/diagnostics-and-rollback.md). Git rollback не равен runtime rollback. Не коммитить секреты, пользовательские настройки, npm trees, базы, logs или backups.

---

Ниже сохранены описание компонентов и исторические измерения прежней сборки. Измерения на Pi 1.0.0 не сертифицируют baseline 1.2.0; текущие результаты — в OpenSpec evidence и `test-results/`.

# my_pi

Воспроизводимая актуальная сборка Pi для рабочего стека IliaFF.

## Зафиксированное состояние

- Pi core `@earendil-works/pi-coding-agent@1.2.0`
- Node.js `>=24.0.0`
- 19 прямых npm dependencies с точными версиями: 16 settings entries и exact runtime peers; полный `package-lock.json`
- direct coding tools + native codemode default-конфигурация: `read`, `grep`, `find`, `edit`, `write` и `bash` доступны модели напрямую; Fabric отсутствует
- детерминированное сжатие `context-fold@0.7.0` без model call и пересказа
- обратимые `{#code FOLDED}` pointers с SHA-256 и `recall_folded` по append-only session ledger
- bounded recovery packet `auto-ultra-compact` как emergency fallback
- precise tool restoration после compaction добавляет `recall_folded` при наличии folded pointers
- Contextimate для оценки статического context footprint
- Cachemire для cache/turn cost diagnostics
- Meantime для фаз ожидания/генерации/tools/harness; `/pace` — локальный timing ledger без дополнительного запроса модели. Включён allowlist и `pi-meantime.json`; состояние в памяти, не persistent profiler.
- persistent агрегированный agent-loop baseline, direct context-output и searchable-context receipt telemetry v4, `/loop-report batching`
- глобальный OpenAlex skill с dependency-free Node helper для поиска научных публикаций и OA-ссылок

Репозиторий содержит три version-gated patch: `pi-train-agents@0.2.7` для глобального `APPEND_SYSTEM.md` и истории всех проектов, `@juicesharp/rpiv-ask-user-question@2.13.8` для первого хода без UI. `pi-background-tasks@2.6.10` ограничен process-only политикой в общей точке запуска. Caveman и его patch удалены по запросу пользователя; правила понятных объяснений находятся в `configs/APPEND_SYSTEM.md`, Ponytail сохранён. Прежний patch `pi-zai-usage` удалён: upstream `1.1.0` включает обработку optional Codex quota windows.

## Текущие packages и расширения

`npm/package.json` фиксирует 19 прямых dependency. В `configs/settings.json` перечислены 16 Pi packages; выключенный `pi-canary` больше не устанавливается. `typebox`, `@earendil-works/pi-coding-agent` и `@earendil-works/pi-tui` закреплены на версиях `1.3.37`/`1.2.0`/`1.2.0` как runtime peers для standalone загрузки `pi-context`. Model-facing coding surface остаётся прямым и проверяемым без wrapper executor.

| Package | Версия | Статус | Для чего нужен |
| --- | ---: | --- | --- |
| `@ff-labs/pi-fff` | `0.11.0` | загружен | Быстрый fuzzy-поиск файлов и содержимого; основной лёгкий finder — `fffind`. |
| `@monotykamary/pi-retry` | `0.11.0` | загружен | Автоматический контролируемый retry для HTTP `400/413`, connection и provider errors. |
| `@spences10/pi-context` | `0.1.16` | загружен | Индексирует большие redacted tool outputs в SQLite FTS5 и даёт `context_search/get/export/list/stats/purge`. |
| `context-fold` | `0.7.0` | загружен | Детерминированно сворачивает старые tool/thinking blocks, заменяет hard compaction verbatim-индексом и восстанавливает детали через `recall_folded`. |
| `pi-web-access` | `0.40.0` | загружен | Web search, URL/GitHub/PDF/YouTube retrieval; tools доступны напрямую по active-tool policy. |
| `@dietrichgebert/ponytail` | `5.2.0` | загружен глобально | Минимальный coding workflow: YAGNI, stdlib/native first, короткий рабочий diff. |
| `@juicesharp/rpiv-ask-user-question` | `2.13.8` | загружен, patched | Structured clarification; patch активирует tool до первого turn и сохраняет cache-stable system prefix. |
| `pi-token-speed` | `0.11.0` | загружен | Показывает скорость генерации tokens/sec по sliding window. |
| `pi-background-tasks` | `2.6.10` | pinned/patched, process-only | Локальные shell jobs/status/logs/kill; без agent telemetry, delegates, Fusion, attribution и auto-wake. |
| `pi-fast-resume` | `1.4.16` | загружен | Быстрый session picker: читает bounded headers вместо полного разбора session-файлов. |
| `@beyona/pi-zai-usage` | `1.1.0` | загружен | Quota/usage footer для OpenAI Codex, Z.ai, OpenCode Go и DeepSeek; upstream обрабатывает optional и Spark quota windows. |
| `pine-of-glass` | `0.15.3` | загружены только 4 extensions | Observability bundle; активны `pi-contextimate`, `pi-traceline`, `pi-cachemire`, `pi-meantime`. |
| `pi-markdown-preview` | `0.22.2` | загружен | Render Markdown/LaTeX в terminal/browser/PDF. |
| `pi-train-agents` | `0.2.7` | загружен, pinned/patched | Ручное обучение глобальных правил по истории всех проектов. |
| `@amaster.ai/pi-browser-use` | `0.1.26` | установлен, extension выключен | Закреплённый поставщик Chrome MCP dependency; browser tools доступны через native codemode. |

| `pi-ssh-remote` | `0.1.15` | загружен, pinned | Постоянное SSH-соединение, reconnect, remote read/write/edit/bash, пароль/ключи/agent и ProxyJump. |

### SSH

```text
/remote ssh user@server -p 22
/remote cd /srv/project
/remote disconnect
```

Без `-i` расширение пробует SSH-agent и ключи, затем запрашивает пароль. Пароли и passphrases хранятся только в памяти процесса; `/remote forget` очищает их. На сервере нужны Bash, SFTP и GNU `timeout`. Сохранённые endpoints, host keys, server memory и credentials в сборку не включены. Установка и регистрация tools проверены; реальное SSH-подключение не проверялось.

### Chrome в WSL

`@amaster.ai/pi-browser-use@0.1.26` остаётся закреплённым поставщиком MCP dependency; его extension выключен через `packages.extensions: []`, без patch и переустановки. Браузер подключён native Pi MCP из `mcp.json`: `chrome`, `exposure: codemode`. 27 tools находятся через `searchTools()`/`describeNamespace("chrome")` и вызываются как `tools.mcp__chrome__*`, но не объявлены модели и не перечисляются в description codemode. Coding tools остаются direct, codemode.mode=on.

Сохранены headless, isolated profile на сессию, executable `/usr/bin/google-chrome`, pageId routing, выключенные usageStatistics/CrUX/experimentalVision и включённый network headers redact. Старый блок `pi-browser-use` в settings не управляет native сервером: менять браузерные flags нужно в `mcp.json`. Chrome должен быть установлен отдельно. MCP подключается на session_start, Chrome запускается при первом браузерном действии; это не on-demand запуск самого MCP process.

На рабочем Pi1.0.0 подтверждены real Chrome150/MCP1.10.1 и 9 nested browser calls через настоящий codemode/AgentSession: snapshot, fill, click, DOM, image и закрытие страницы. В каждой scripted model request: 0 браузерных schemas; прежний wrapper объявлял 16 schemas/15 263 JSON characters. Description codemode остался 1 059 characters в изолированном сравнении. Это символы, не измеренные provider tokens. Fresh полный RPC: stderr0, native `/mcp` присутствует, `/browser-tools` отсутствует, 0 messages/model runs. LLM planning, произвольные сайты, полный interacting tool loop всех extensions и Windows CDP этим не сертифицируются; произвольные сайты требуют отдельной проверки.

`configs/mcp.json` — переносимый baseline. Installer добавляет отсутствующий entry `chrome`, сохраняя существующие servers и пользовательский entry с тем же именем; путь MCP адаптируется к agent directory. Maintenance не перезаписывает пользовательский `mcp.json`. После изменения — `/reload`; состояние — `pi mcp list` или `/mcp`. Браузерные schemas из уже записанной истории сессии задним числом не исчезают.

### pi-train-agents: глобальные правила

`pi-train-agents@0.2.7` установлен с version-gated patch `patches/pi-train-agents+0.2.7.patch`. Конфиг `train-agents/config.json`: `targetFile: "APPEND_SYSTEM.md"` относительно agent directory, `sessionScope: "all"` через native `SessionManager.listAll()`. История ограничена текущим agent directory, последними 30 днями и 100 новыми/изменёнными сессиями за проход; текущая сессия и копии с тем же session id исключаются. Кэш общ для выбранного глобального файла.

Команды: `/train-agents status`, `/train-agents analyze`, `/train-agents propose`, `/train-agents review`; без аргумента — анализ и предложение. Ничего не анализируется автоматически. Анализ отправляет историю выбранному провайдеру; setup и offline regression этого не делают. Запись — только после ручных подтверждений. Цитаты связаны с конкретным source; принятая часть предложения повторно проверяется, файл обновляется атомарно с backup и freshness guard. Skills не изменяются. После изменения глобальных инструкций `/reload` перечитывает их.

Предложение показывает `find`, `anchor` и `replace` целиком, без обрезки до 100 символов; пустой replacement обозначен `""`. Настоящие no-op и взаимно отменяющиеся правки блокируются при генерации и повторной проверке перед записью. Общий бюджет вычисляется по полученному тексту; delta каждой правки — последовательно, поэтому их сумма совпадает с общим изменением (UTF-8 bytes/4, округление вверх). Успешная запись выдаёт одно постоянное сообщение, без второго одинакового UI notification; счётчик берётся из фактически применённых изменений.

Регрессионная проверка: `node scripts/test-train-agents.mjs` (проверяет live installation в `~/.pi/agent`, либо путь из первого аргумента; только временные сессии, fake model/UI). Maintenance update переиспользует патч; перенос на новую версию требует явной проверки. Кэш между разными Pi processes остаётся last-writer-wins; полноценный межпроцессный lock не добавлен.

### Локальные extensions

| Файл | Статус | Назначение |
| --- | --- | --- |
| `auto-ultra-compact/index.ts` | активен | Следит за threshold, проверяет compactability, запускает continuation и пишет bounded recovery packet только как emergency fallback. |
| `deferred-tools.ts` | активен | Сохраняет ранее объявленный managed loadout при startup старой ветки; новые сессии используют native deferred/tool_search. |
| `loop-profiler.ts` | активен | Последние 500 runs: model/tool timing без двойного счёта, медленные/ошибочные tools, native nested calls, context output, cache, стоимость из usage и stop reason. Pi 1.2 user/custom starts; legacy records читаются; raw trace только при `PI_PROFILE=1`. |
| `todo-queue/index.ts` | активен | Постоянная очередь в проектном `TODO.md`: `+`, `/queue`, locked atomic writes и проверяемое завершение через `task_queue`. |
| `herdr-agent-state.ts` | условно активен | Herdr TUI status hook; без `HERDR_ENV`, socket и pane не выполняет действий. Сам Herdr устанавливается отдельно. |

`project-loop.ts`, его auto-preflight, пять schemas и `/fast-fix` удалены: coding flow выполняется последовательными или параллельными direct tool calls.

### OpenAlex skill

`skills/openalex/` устанавливается глобально в `~/.pi/agent/skills/openalex/`. Skill выполняет bounded-поиск OpenAlex, exact DOI lookup, year/OA filtering и передаёт найденные законные full-text ссылки в `pi-web-access`; helper использует только Node.js stdlib.

### Что отключено и почему

| Компонент | Текущее состояние | Причина |
| --- | --- | --- |
| Fabric runtime | полностью удалён | Full-code mode скрывал direct schemas, добавлял latency и orchestration complexity без экономии model calls. |
| Локальный `output-compactor` | полностью удалён | Заменён готовым searchable sidecar `@spences10/pi-context@0.1.16`; оба `tool_result` interceptor одновременно не загружаются. |
| Локальный `context-compaction.ts` | полностью удалён | Заменён `context-fold@0.7.0`: без model summarizer, external excerpt store и второго compaction-owner. |
| Pi experimental tool-output pruning | выключен | Не мутирует историю lossy pruning; большие результаты обрабатывает searchable context sidecar. |
| `pi-canary` | удалён из lock, patches и managed configs | Не загружался и не давал функций рабочему стеку. Повторная установка — только под конкретную задачу. |
| Локальный `tools.ts` | полностью удалён | Уже был выключен; native tools и `context-fold` покрывают текущую поверхность без дополнительного lifecycle-owner. |
| Legacy project-loop | удалён | Убирает auto-preflight и пять постоянных schemas; discovery/edit/test остаётся direct. |
| Legacy keyword tool router и `lean-tools.ts` | удалены | Они вызывали `setActiveTools()` на turn boundaries; web `promptSnippet` пересобирал system prompt и ломал prefix cache. |

## Что намеренно исключено

Репозиторий не содержит:

- `auth.json`, API keys, токены или npm credentials
- sessions, recovery packets, context-store и логи
- npm cache и установленное `node_modules`
- runtime-состояние Telegram, Intercom, Pi Studio и SSH; `models-store.json`, host-specific `models.json` и cloud account IDs
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

Если Pi `1.2.0` уже доступен через `PATH`:

```bash
./install.sh
```

Для обновления существующего личного runtime без сброса модели, провайдера и инструкций:

```bash
./install.sh --preserve-settings --install-core
```

Сохраняются settings/APPEND/context policy; только известные explicit npm pins выравниваются по source lock. Управляемые расширения заменяются под backup. После установки нужен restart; текущая сессия не перезагружается автоматически.

Установщик:

1. Проверяет Node.js, npm, Python, `patch` и `tar`.
2. Проверяет release и exact-version patch replay.
3. Создаёт rollback backup управляемых agent-файлов.
4. Выполняет `npm ci --ignore-scripts --legacy-peer-deps` по lock-файлу.
5. Устанавливает default config, local extensions, OpenAlex skill и UI configs; добавляет Chrome MCP без перезаписи существующих servers, а train-agents config — только если его ещё нет.
6. Применяет совместимые patch и запускает verification.
7. При ошибке восстанавливает backup.

Другой основной agent directory:

```bash
PI_CODING_AGENT_DIR=/path/to/agent ./install.sh
```

После установки авторизуйте provider отдельно и перезапустите Pi.

## Compaction

`context-fold@0.7.0` — единственный owner `session_before_compact`. Default `CONTEXTFOLD_COMPACT=det` заменяет LLM-summary детерминированным verbatim seed index. Raw history остаётся в append-only session JSONL; `{#code FOLDED}` восстанавливается через `recall_folded` с проверкой SHA-256.

Fold ladder начинает сворачивать stale `tool_result` и `thinking` blocks при 45% context window; user intent, assistant conclusions, tool calls и свежий tail не сворачиваются. Обычный fold требует экономию минимум 12% окна. Несжимаемый tail/roots остаётся честно обозначенным floor.

Pi-конфигурация сохраняет `reserveTokens: 12500` и `keepRecentTokens: 12000`. `auto-ultra-compact` проверяет compactability, запускает threshold compaction и post-compaction usage check; recovery packet используется только как emergency fallback. Ручной `/compact` остаётся без automatic continuation. После восстановления агент перечитывает текущий проектный `TODO.md`: цели, статус и следующие шаги не переносятся в recovery packet как авторитетное состояние.

Настройка и статус:

```text
/context-fold
/context-fold config
```

## Native deferred tools и кэш

В новой сессии `remote`, `preview_export`, `context_list`, `context_stats` и `context_purge` зарегистрированы как `deferred`: схемы не объявляются заранее, но инструменты остаются callable из `codemode`. Native `tool_search` включён в defaultTools рядом с codemode и находит/активирует нужное для следующего модельного вызова. Discovery может требовать дополнительного раунда; известные вызовы из codemode не требуют предварительной direct-активации. Частые coding/retrieval/question/queue tools и весь bg lifecycle не меняются. Browser MCP остаётся codemode.

Подгрузка append-only: для поддерживаемого `openai-codex/gpt-6.1-sol` новые схемы попадают в историю как `additional_tools`, а прежние tools/instructions/cache key и input prefix сохраняются. Не выгружаем инструменты автоматически и не переопределяем schemas. Для адаптеров без нужных compat flags действует native fallback; это не обещание cache hit/TTL, скорости или качества.

`deferred-tools.ts` на `session_start` восстанавливает только эти пять имён и tool_search из текущей записанной ветки: SDK defaults иначе заменяют старый active loadout. Старая сессия сохраняет ранее объявленные редкие tools; новый loader туда не вставляется. Guard не меняет остальные UI/background tools, executors или историю. Перезапуск нужен для нового кода; уменьшение стартового набора видно в **новой сессии**, не после простого resume старой. Не удаляйте историю ради цифры Tools.

Обязательный offline SDK regression загружает реальные patched packages, вызывает только disconnected remote status и пустые context stats/list, проверяет discovery, partial/legacy resume и Codex request payload до транспорта. В этом package fixture initial schemas уменьшились с14770 до9252 JSON bytes (минус5518), уже с учётом native tool_search. Это bytes, не tokens и не измерение всего личного footer7.1k; preview renderer, destructive purge, SSH connect и live provider/cache не запускались.

## Observability

Default-конфигурация включает `pi-contextimate`, `pi-cachemire`, `pi-traceline` и `pi-meantime` из `pine-of-glass@0.15.3`. Meantime включён через `pi-meantime.json`; `/pace` показывает локальный timing ledger, live widget — текущую фазу. Дополнительного model call нет. Это session-local наблюдения, не persistent loop baseline и не доказанная причина задержки. Нужен reload/restart. Upstream ищет user config в `HOME/.pi/agent` (или project `.pi`); нестандартный `PI_CODING_AGENT_DIR` сам по себе этот путь не перенаправляет.

`loop-profiler.ts` постоянно хранит только bounded агрегаты последних 500 agent runs в `~/.pi/agent/observability/loop-runs.jsonl`: каталог создаётся с правами `0700`, файл — `0600`. Prompt, messages, tool arguments, tool results, tool-call IDs и секреты туда не записываются; сохраняются counters/histograms и metadata запуска, модели, task/run IDs. Project correlation использует короткий hash пути; raw event trace остаётся opt-in через `PI_PROFILE=1`.

```text
/loop-report last
/loop-report baseline
/loop-report batching
/loop-report pilot-start
/loop-report pilot
/loop-report pilot-stop
```

Grouping pilot собирает пять завершённых baseline code tasks, затем пять grouped tasks с локальным напоминанием о независимых bounded проверках. Task, активная при `pilot-start`, исключается. Несколько запусков одной задачи суммируются до первого завершения; не дробите задачи ради метрики. Scope фиксирует project/provider/model/thinking; ошибки, проверки и неполнота наблюдения остаются в отчёте. Команды не обращаются к модели.

После пяти baseline tasks исходные receipts копируются в отдельный private `baseline.json` (`0600`, каталог `0700`). Полностью записанный snapshot публикуется атомарно без перезаписи; последующие исправления receipts, поздние baseline tasks и очистка общего ring log не меняют базовые значения. Повреждение snapshot даёт warning, а не тихий reset. Не удаляйте active pilot для «улучшения» результата; используйте явный `pilot-stop`.

Разные задачи не образуют контролируемый benchmark. Результат descriptive, не доказательство ускорения/качества; неизвестные проверки через shell/background не считаются отсутствовавшими. Пока нет валидных пяти baseline и пяти grouped tasks, вывод — `insufficient data`. После обновления extension нужен restart; замена файла не обновляет уже загруженный модуль.

Report фильтруется по текущему project path и показывает duration, TTFT, provider response-header latency, model/tool rounds, validation rounds и cache usage. Duration/TTFT по-прежнему считаются от начала запуска, чтобы не менять смысл старых метрик. Время от принятого `input` до начала запуска показано отдельно как `input preparation`, если оба события наблюдались. Поддерживаются Pi 1.2 `user` и `custom` starts без `prompt`; повторные starts до `agent_settled` не обрезают текущую операцию.

Дополнительные поля v4: `model phase` — интервалы от `turn_start` до assistant `message_end` (подготовка/сеть/генерация, не чистое время inference); `active tools` — объединение интервалов всех tools, без двойного счёта параллельных и вложенных вызовов; `overlap` — пересечение model/tool phases; `other` — оставшееся время. Сумма `model phase + active tools - overlap + other` равна duration с погрешностью округления. `slow tools` и `failed tools` показывают суммарные миллисекунды по именам: это не wall-clock, пересечения здесь включены. Отдельно показываются число native nested calls, последний stop reason и стоимость из сообщённого моделью usage, не счёт провайдера. `incomplete` отмечает пропуски/дубликаты событий или незавершённый run; отсутствие метрик не означает нулевую работу. Ошибка записи профиля не прерывает lifecycle агента.

Telemetry v4 считает текстовые chars и image blocks результатов верхнего уровня, а также число распознанных `pi-context` receipts. Native nested results учитываются отдельно и не прибавляются второй раз к model context. Это наблюдение extension-событий, не реконструкция финального provider payload. Source IDs, paths, prompt, raw output и arguments не записываются. Старые v1/v2/v3 records и legacy Fabric/output-compactor aggregates остаются читаемыми; новые runs помечаются `searchable-context-v4`.

Проверки без API-вызовов:
```bash
node scripts/test-loop-profiler.mjs
node scripts/test-loop-profiler-sdk.mjs /path/to/node_modules/@earendil-works/pi-coding-agent
```
SDK-проверка использует настоящие user/custom sessions и native codemode, faux provider и временные файлы; сетевые запросы запрещены. Идеи сверены с `@jy02414216/pi-task-timer@1.1.3` (объединение интервалов и failed time), `pi-metrics@0.8.0` (агрегация до settled) и `pi-trace-extension@0.1.16` (stop reason/стоимость); их код и зависимости не подключаются, содержимое запросов/результатов не сохраняется.

`configs/APPEND_SYSTEM.md` разрешает группировку, только когда она уменьшает модельные раунды или лишний вывод: независимые операции с уже известными входами можно объединять, зависимые решения остаются последовательными. Выбор direct calls или `codemode` зависит от доступного runtime API, не от фиксированного числа операций. Не объединяйте полные большие документы ради счётчика вызовов: это может потребовать дополнительных чтений sidecar. Для больших результатов сначала используются `context_search` и bounded `context_get`; для полного анализа redacted source — `context_export` и затем `rg`/`jq`/Python.

## Windows Terminal visual

Переносимый visual snapshot лежит в `windows-terminal/`: sanitized `settings.json`, Catppuccin Mocha background и короткая инструкция. Username, absolute host paths и machine-specific profiles исключены. Требуется JetBrainsMono Nerd Font; подробности — `windows-terminal/README.md`.

## Searchable context sidecar

`@spences10/pi-context@0.1.16` перехватывает большие текстовые `tool_result` без model calls, redacts известные секреты, lossless-разбивает текст примерно по 4096 bytes и индексирует chunks в SQLite FTS5 (`~/.pi/agent/context.db`). Generic threshold — `24576` bytes или `300` строк, MCP threshold — `51200` bytes или `2000` строк. В model context остаётся receipt с preview и инструкциями. Полный сохранённый **redacted** source восстанавливается через `context_export`; focused retrieval — через `context_search` и `context_get`.

Воспроизводимая policy лежит в `configs/pi-context.json`: preset `balanced`, 7 дней и logical source cap 250 MiB. Это не физический hard cap SQLite/WAL, а cleanup policy, которая не запускается после каждой записи. Installer сливает policy в `~/.pi/agent/my-pi-settings.json` (`packages.context`), не затрагивая settings других packages, создаёт `context.db` с mode `0600` и включает весь settings-файл в rollback backup. Managed exports создаются с `0700/0600`.

Известные ограничения upstream `0.1.16`: tool input summary хранится без redaction; lowered custom generic threshold всё равно ограничен предварительным default gate 24 KiB; `context_search` с известным `source_id` может вернуть metadata/snippet другого scope, хотя `context_get` scope соблюдает; mixed text+image capture заменяет весь result текстовым receipt и теряет image block. Поэтому не передавайте секреты в tool arguments, не используйте `global:true` без необходимости и не считайте sidecar security boundary для недоверенных локальных пользователей. Старые `~/.pi/agent/output-artifacts/` installer не удаляет, но локальный `output-compactor` больше не загружается.

## Проверка установленного стека

Проверка разгрузки стека, границы совместимости и измерения поиска: [docs/stack-review.md](docs/stack-review.md).

```bash
~/.pi/agent/maintenance/scripts/verify.sh
```

Проверка release с чистым patch replay:

```bash
python3 scripts/test-release.py
node scripts/test-stack-surface.mjs ~/.pi/agent
node scripts/compare-search.mjs "$PWD" ~/.pi/agent
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

`pi update --self` может заменить Pi core. Репозиторий фиксирует `1.2.0`; обновление core нужно сначала проверить и зафиксировать здесь.

Все прямые зависимости сверены с npm `latest` при обновлении. `configs/settings.json` больше не закрепляет версии packages: `pi update --extensions` обновляет их, а exact lock сохраняет воспроизводимую установку этого release. Version-gated patches по-прежнему запрещено применять к неизвестной версии; safe updater в таком случае откатывает обновление. Для перехода на новый patched package сначала обновите patch и release.

Ограничение baseline: `@beyona/pi-zai-usage@1.1.0` объявляет старый peer range Pi, поэтому установка использует `--legacy-peer-deps`. RPC startup входит в обязательный gate. Актуальный `npm audit` ядра 1.2.0 отдельно не запускался; прежние результаты для ядра 1.0.0 не описывают этот baseline.

## Откат

```bash
./uninstall.sh --dry-run
./uninstall.sh
```

Откат восстанавливает agent configs из backup перед установкой. Pi core автоматически не понижается.

## Структура

- `npm/` — exact dependency set и lock
- `configs/` — default configs без секретов, включая balanced `pi-context.json`
- `local-extensions/` — compaction, profiler, reader и TODO queue
- `skills/openalex/` — OpenAlex workflow и dependency-free helper
- `patches/` — exact-version diffs
- `scripts/maintenance.py` — snapshot, backup, patch, restore и verify
- `scripts/update-safe.sh` — контролируемое обновление
- `scripts/test-release.py` — release/security/patch replay
- `manifest.json` — машинно-читаемая topology сборки

## Background shell pilot

`/bg [--survive-reload] [--name "Task name"] <command>` запускает локальный shell job; `/jobs`, `/logs <id>`, `/kill <id>`, `/tasks` — управление. `bg_run` требует `isAgent:false`; completion уведомляет, но не запускает model turn. Например: `/bg --name "Pi tests" cd /path/to/pi-build && npm test`. Работа над независимыми документами допустима; проверяемый код до завершения не менять. Exit evidence связывать с тем же revision/diff и authoritative TODO, не с новым состоянием файлов.

Default deadline 600s; tool позволяет явный конечный timeout >=1s. Per-job output cap 1MiB; превышение останавливает job, причина есть в status/metadata. Запросы логов ограничены 50KiB или меньшим maxBytes. Полные bounded логи находятся в project `.pi/tasks`; явный shell имеет права пользователя и может сам запускать любые программы/сеть — это не sandbox. SSH routing инструментов Pi на этот Node spawn не распространяется.

Без opt-in job прекращается при reload. `surviveReload:true`/`--survive-reload` сохраняет только тот же живой процесс при same-process reload; quit/restart останавливает, PID adoption/crash recovery не обещаны. Старые файлы остаются артефактами, а не активными jobs новой сессии. Общая квота всех сессий/автоочистка не реализованы: проверять размер `.pi/tasks`, удалять старые артефакты только явно после завершения jobs. `/bg-clear` убирает terminal records из памяти, не гарантирует очистку диска. Delegate/Fusion/attested/attribution, agent jobs и auto-wake запрещены patch; попытки feature override отклоняются. Attribution entry не загружается, update checks отключены. После установки нужен reload/restart.
