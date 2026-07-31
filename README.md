# my_pi

Воспроизводимая актуальная сборка Pi для рабочего стека IliaFF.

## Зафиксированное состояние

- Pi core `@earendil-works/pi-coding-agent@0.83.0`
- Node.js `>=22.19.0` (рабочий хост: Node.js 24)
- 21 прямое расширение с точными версиями и полный `package-lock.json`
- default-профиль с нативными file tools, `fffind`, lazy web/Telegram и structured clarification
- дополнительные профили: `research`, `typed`, `fabric`, `tmux`
- launcher `pi-profile`
- recovery-aware compaction `recovery-v2-10k`
- основной summarizer `openai-codex/gpt-5.6-luna`
- deterministic validation, один corrective retry, current-model fallback и Pi built-in fallback
- checksum-verified external excerpts и lazy `context_recall`
- bounded recovery packet как emergency fallback, а не обязательный повтор summary
- precise tool restoration: compacted history восстанавливает только `context_recall` по `ctxref://`

Репозиторий содержит три version-gated patch для `@beyona/pi-zai-usage@0.4.0`, `pi-canary@1.4.0` и `pi-caveman@1.0.7`.

## Что намеренно исключено

Репозиторий не содержит:

- `auth.json`, API keys, токены или npm credentials
- sessions, recovery packets, context-store и логи
- npm cache и установленное `node_modules`
- runtime-состояние Telegram, Intercom и Pi Studio
- project-specific конфиги
- абсолютные host-specific пути

Авторизацию провайдера нужно создать отдельно. Профили ссылаются на общий `auth.json`, но сам файл не публикуется.

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
3. Создаёт rollback backup управляемых agent/profile/launcher файлов.
4. Выполняет `npm ci --ignore-scripts --legacy-peer-deps` по lock-файлу.
5. Устанавливает default config, пять local extensions и UI configs.
6. Создаёт четыре profile directories и безопасные symlink на общие extensions/npm/auth.
7. Устанавливает `~/.local/bin/pi-profile`.
8. Применяет совместимые patch и запускает verification.
9. При ошибке восстанавливает backup.

Другой основной agent directory:

```bash
PI_CODING_AGENT_DIR=/path/to/agent ./install.sh
```

Профили и launcher устанавливаются относительно текущего `$HOME`: `~/.pi/profiles` и `~/.local/bin`.

После установки авторизуйте provider отдельно и перезапустите Pi.

## Профили

```bash
pi-profile default
pi-profile research -p "Analyze this build log"
pi-profile typed
pi-profile fabric -p "Run repetitive checked operations"
pi-profile tmux
```

- `default` — lean native core, FFF, lazy web/Telegram/context recall.
- `research` — default + Pi Context + Context Mode.
- `typed` — ReadSeek 0.5.18 + Lens с отключённым noisy context injection/auto-fix.
- `fabric` — один `fabric_exec`, QuickJS, без network/agents/MCP/UI.
- `tmux` — Pi Context + Goal + Intercom + Telegram.

Подробности: `configs/PROFILES.md`.

## Compaction

Каждый профиль использует:

- `reserveTokens: 12500`
- `keepRecentTokens: 24000`
- hard summary output cap 10k
- Luna custom compaction
- deterministic validator
- один corrective retry
- current-model fallback
- external exact excerpts под `~/.pi/agent/context-store/`
- lazy `context_recall`

Validated summary продолжает работу напрямую. Recovery packet читается только при явной потере state.

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
for profile in default research typed fabric tmux; do
  timeout 20 pi-profile "$profile" --mode rpc --no-session </dev/null
 done
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

Откат восстанавливает agent configs, profiles и launcher из backup перед установкой. Pi core автоматически не понижается.

## Структура

- `npm/` — exact dependency set и lock
- `configs/` — default configs без секретов
- `profiles/` — profile-specific settings
- `local-extensions/` — compaction, tool routing и profiler
- `bin/pi-profile` — portable profile launcher
- `patches/` — exact-version diffs
- `scripts/maintenance.py` — snapshot, backup, patch, restore и verify
- `scripts/update-safe.sh` — контролируемое обновление
- `scripts/test-release.py` — release/security/patch replay
- `manifest.json` — машинно-читаемая topology сборки
