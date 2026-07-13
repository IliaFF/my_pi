# my_pi

Воспроизводимая сборка Pi для текущего рабочего стека IliaFF.

## Зафиксированное состояние

- Pi core `@earendil-works/pi-coding-agent@0.80.6`
- Node.js `>=22.19.0`
- 23 прямые зависимости расширений с точными версиями
- 367 записей пакетов в `package-lock.json`
- `pi-continue@0.9.3` как единственный владелец compaction continuation
- Canary `1.4.0`: `COUNT=3`, `POSITION=end`, `VARIANT=fixed`, `FAIL_COMPACT=3`
- native `/resume`, `pi-fast-resume` работает с `hijackResume=false`
- ReadSeek владеет `read`, `edit`, `write`
- FFF владеет `find`, `grep`
- shell остаётся нативным инструментом Pi
- Traceline загружается выборочно из `pine-of-glass@0.6.1`
- `pi-diff-review@0.1.26`

Репозиторий содержит пять локальных патчей с проверкой точной версии. Патч Pi core устраняет потерю `streamingBehavior` при отправке сообщений из очереди после compaction.

## Что намеренно исключено

Репозиторий не содержит:

- `auth.json`, токены и ключи API
- сессии и recovery-файлы
- кэши MCP и npm
- локальное состояние Pi Studio
- project-specific `.mcp.json`
- host-specific абсолютные пути

Авторизацию провайдера и MCP-конфигурацию нужно создать отдельно на целевом хосте.

## Предварительная проверка

```bash
git clone https://github.com/IliaFF/my_pi.git
cd my_pi
./install.sh --dry-run --install-core
```

Dry-run не меняет хост. Он скачивает официальные npm-архивы во временный каталог, повторно применяет все патчи, проверяет lock-файл, конфиги и отсутствие известных приватных файлов.

## Установка

На чистом хосте:

```bash
./install.sh --install-core
```

Если Pi `0.80.6` уже доступен через `PATH`:

```bash
./install.sh
```

Установщик:

1. Проверяет Node.js, npm, Python, `patch` и `tar`.
2. При явном `--install-core` устанавливает точную версию Pi глобально.
3. Создаёт rollback-backup управляемых файлов.
4. Выполняет `npm ci --ignore-scripts --legacy-peer-deps` по точному lock-файлу. Peer-зависимости предоставляет Pi core.
5. Устанавливает безопасные конфиги и локальный `/tools`.
6. Применяет только патчи для совпавших версий.
7. Запускает полную статическую проверку.

Другой каталог агента:

```bash
PI_CODING_AGENT_DIR=/path/to/agent ./install.sh
```

Скрипт идемпотентен. Повторный запуск создаёт новый backup и воспроизводит то же состояние.

## Проверка установленного стека

```bash
~/.pi/agent/maintenance/scripts/verify.sh
```

Проверка исходного release с чистым replay патчей:

```bash
python3 scripts/test-release.py
```

После установки перезапустите Pi. Затем вручную проверьте `/diff`, закрыв окно клавишей `q`, и проведите контролируемый compaction с queued message.

## Безопасное обновление расширений

Сначала обязательный dry-run:

```bash
~/.pi/agent/maintenance/scripts/update-safe.sh --dry-run
```

Только после успешного результата:

```bash
~/.pi/agent/maintenance/scripts/update-safe.sh
```

Скрипт создаёт полный backup npm-дерева и патченных файлов, обновляет незакреплённые расширения, возвращает управляемые конфиги, повторно применяет совместимые патчи и проверяет результат. При ошибке он автоматически восстанавливает backup. Неизвестная версия патченного пакета вызывает отказ вместо попытки применить несовместимый diff.

`pi update --self` может заменить Pi core. После self-update локальный core patch не применяется к новой версии из-за точного version gate. Сначала обновите и протестируйте патч в этом репозитории.

## Откат файлов агента

```bash
./uninstall.sh --dry-run
./uninstall.sh
```

Откат восстанавливает управляемые файлы из backup, созданного перед последней установкой. Версия Pi core не меняется автоматически. Это исключает скрытую глобальную переустановку npm-пакета.

## Структура

- `npm/` — точный набор расширений и lock-файл
- `configs/` — публикуемые конфиги без секретов
- `patches/` — version-gated unified diffs
- `local-extensions/` — локальный `/tools`
- `scripts/maintenance.py` — backup, patch, verify и snapshot logic
- `scripts/update-safe.sh` — контролируемое обновление расширений
- `scripts/test-release.py` — чистый replay release
- `manifest.json` — машинно-читаемый список патчей и конфигов
