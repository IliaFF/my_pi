# Отдельный чистый Pi Demo

Официальный npm Stable `@earendil-works/pi-coding-agent@1.4.0` (тег `latest` проверен 2026-10-28), без сторонних extensions, skills, prompts и текущих credentials. Это не замена управляемой сборки.

## Запуск

```bash
pi-demo
# Если ~/.local/bin отсутствует в PATH:
~/.local/bin/pi-demo
```

Команда всегда открывает `~/.local/share/pi-demo/workspace`, даже при запуске из другого проекта. Внутри Pi выполните `/login` для отдельной авторизации и `/model` для выбора модели. До этого model requests не проверялись и не выполнялись. Обычный `pi` продолжает запускать прежнюю сборку.

## Файлы

Все пути ниже относятся к настоящему HOME пользователя, установившего demo:

- `~/.local/share/pi-demo/runtime/` — отдельный npm prefix, exact Pi version и локальный package-lock.
- `~/.local/share/pi-demo/agent/` — отдельные settings, auth, sessions и будущие расширения.
- `~/.local/share/pi-demo/home/` — HOME процесса demo, без личных shared skills и shell profiles.
- `~/.local/share/pi-demo/workspace/` — отдельный рабочий каталог, вне исходного проекта.
- `~/.local/bin/pi-demo` — launcher.

Launcher использует `env -i`: API keys, `NODE_OPTIONS`, `PI_*`, XDG overrides и прочие настройки текущей сессии не наследуются. Сохраняются только явно выбранные PATH, TERM и LANG; Node определяется перед очисткой. Для demo отключена install telemetry. Offline — только флаг проверки, не ограничение обычного запуска.

## Установка и launcher

Нельзя выполнять поверх существующих файлов: сначала проверить отсутствие prefix и launcher, включая symlinks. Установка использует официальный npm способ без lifecycle scripts, но без `-g`:

```bash
base="$HOME/.local/share/pi-demo"
launcher="$HOME/.local/bin/pi-demo"
for p in "$base" "$launcher"; do
  if test -e "$p" || test -L "$p"; then
    printf 'CONFLICT: %s\n' "$p" >&2
    exit 1
  fi
done
umask 077
mkdir -p "$base" "$HOME/.local/bin"
mkdir "$base/runtime" "$base/agent" "$base/home" "$base/workspace"
printf '{"name":"pi-demo-runtime","private":true}\n' > "$base/runtime/package.json"
npm install --prefix "$base/runtime" --save-exact --ignore-scripts --no-audit --no-fund \
  @earendil-works/pi-coding-agent@1.4.0
```

Содержимое `~/.local/bin/pi-demo` (после записи выполнить `chmod 700 ~/.local/bin/pi-demo`):

```sh
#!/bin/sh
set -eu
base=$(CDPATH= cd -- "$(dirname -- "$0")/../share/pi-demo" && pwd)
node=$(command -v node)
cd "$base/workspace"
exec env -i \
  HOME="$base/home" \
  PATH="$(dirname -- "$node"):/usr/local/bin:/usr/bin:/bin" \
  TERM="${TERM:-xterm-256color}" \
  LANG="${LANG:-C.UTF-8}" \
  PI_CODING_AGENT_DIR="$base/agent" \
  PI_TELEMETRY=0 \
  "$node" "$base/runtime/node_modules/@earendil-works/pi-coding-agent/dist/bundle/cli.js" "$@"
```

Перед первым запуском проверить context files (`AGENTS.override.md`, `AGENTS.md`, `CLAUDE.md` и варианты регистра) и `.agents/skills` в workspace и его родителях: cwd не отменяет инструкции родителей. В исходной установке таких файлов нет. Не копировать личные `settings.json`, `auth.json`, `.pi` или credentials в demo автоматически.

## Как расширять позже

Добавляйте только выбранные ресурсы в отдельный `agent/extensions/`, `agent/skills/`, `agent/prompts/` или устанавливайте пакет командой `pi-demo install npm:<package>`. Для demo-проекта можно использовать `.pi` в workspace со штатным project trust. После добавления ресурсов это уже не чистая базовая демонстрация.

Встроенные `builtin:mcp`, `builtin:llama.cpp`, `builtin:codemode`, `builtin:tool-search` — часть официального Pi, не сторонний стек. Они остаются включены. Не применять `--no-extensions` ради «чистоты»: этот флаг отключает и их. Доступность встроенного extension не означает, что подключён MCP server или запущена локальная модель.

## Проверки и ограничения

Без model requests проверить `pi-demo --version`, `pi-demo --offline --help`, `pi-demo list`, SDK discovery и RPC `get_state`/`get_commands`. В проверках Node network guard дополнительно запрещает fetch/http/net; это не OS network sandbox. Версия demo не должна меняться вместе с source lock или личным SDK. `npm test` исходной сборки — отдельный gate, не тест ответа модели.

В первом offline-запуске возможны предупреждения `fd not found` и `ripgrep not found`: demo не заимствует бинарники из текущего `~/.pi/agent/bin`. Штатная загрузка этих утилит при обычном online-запуске не проверялась. Это служебные утилиты ядра, не сторонние Pi extensions.

Никакие обновления или удаление не выполняются автоматически. Не запускайте global npm install или updater текущей сборки ради demo. Runtime, lock, credentials и sessions demo не коммитить.

**Важно:** это изоляция установки и настроек, не sandbox. Процесс работает с правами текущего пользователя (здесь root); built-in tools могут читать и менять файлы вне workspace. Для показа на недоверенных задачах нужен отдельный OS user/container. Авторизация провайдера, ответы модели и внешний браузерный login не проверены.
