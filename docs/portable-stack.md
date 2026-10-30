# Переносимый пользовательский стек

Источник сборки — `IliaFF/my_pi`, а не установленный maintenance directory или upstream Pi. `install.sh` собирает Pi, подключённые расширения, отдельный Firstmate, backend/tooling и MCP-окружения. Это source release: публикация сама по себе не обновляет работающий пользовательский runtime.

## Состав и границы

| Компонент | Закрепление | Источник |
| --- | --- | --- |
| Firstmate | `7da4c3621370534ff9689843d2b77f34158057fb` | https://github.com/kunchenguid/firstmate |
| Herdr backend | `0.9.5`, SHA-256 release binary | https://github.com/herdrdev/herdr/releases/tag/v0.9.5 |
| Treehouse | `3.1.6`, SHA-256 release archive | https://github.com/kunchenguid/treehouse/releases/tag/v3.1.6 |
| GitHub CLI | `2.103.3`, SHA-256 release archive | https://github.com/cli/cli/releases/tag/v2.103.3 |
| jq | `1.8.1`, SHA-256 release binary | https://github.com/jqlang/jq/releases/tag/jq-1.8.1 |
| Jev browser MCP | `@jkudish/jev-browser@0.8.3` + transitive npm lock | https://github.com/jkudish/jev-browser |
| Paper search MCP | upstream `cab1b5cc276a0cd004a0044003926a6440088049` + installed-code patch | https://github.com/openags/paper-search-mcp |
| Python для paper-search | CPython `3.13.7`, runtime requirements с точными версиями | `stack/lock.json`, `stack/paper-requirements.txt` |
| Pi workspace history | `0.5.2`, основной exact npm lock | `npm/package.json` |
| Пользовательские skills | `cpp-styleguide`, `python-styleguide`, `latex-simple-style` | `skills/` |
| AITunnel | регистрация провайдера и модели без ключа | `local-extensions/aitunnel.ts` |

`pi-herdr-agents@3.3.1` больше не входит в default Pi runtime. Установщик убирает только его прежнюю default/unversioned npm-декларацию из сохраняемого settings и добавляет закреплённый workspace-history. Существующие Herdr config/state, самостоятельный backend и поддержка Herdr в Firstmate не удаляются. Старые исследовательские harnesses и неактивный patch остаются историческими артефактами, а не обещанием проверки отсутствующего Pi plugin.

## Установка

Начальный artifact target — Linux x86_64, включая WSL. Нужны Node >=24, npm, Python 3 для самого установщика, Bash, Git, curl, GNU tar/timeout, patch, tmux и `uv` с поддержкой Python `3.13.7` (проверялся CLI `0.9.11`). Chrome MCP по-прежнему требует доступный Google Chrome; Playwright Chromium для Jev устанавливается отдельно в private stack store. Системные библиотеки браузера должны быть доступны. Установщик не запускает `sudo`/apt и не меняет SSH или службы. Нужен интернет к GitHub, npm, PyPI, Python/Playwright distribution endpoints и место для двух браузеров/виртуального окружения.

Обычный `./install.sh --install-core` сначала проверяет source release и prerequisites, затем создаёт backup управляемых файлов. Fresh source preflight не требует ещё не установленные Pi/context-fold: его internal source-only mode пропускает только установленный-runtime compaction SDK check. Структурные, privacy, registry patch и независимые harness checks остаются; полный `npm test` явно выключает этот режим и выполняет настоящий SDK check. `--preserve-settings` сохраняет выбор модели/провайдера и личные инструкции; известные package pins выравниваются, retired default удаляется, workspace-history добавляется. Для другого agent directory используйте `PI_CODING_AGENT_DIR`, как в основном README.

Firstmate и его runtime создаются **не** поверх существующего независимого checkout, а в `<agent>/stack/<identity>/firstmate`. В нём initial backend — Herdr, `config/crew-harness` — `pi`; primary запускается командой Pi по upstream Quick Start. Его `.pi/extensions` остаются project-scoped; глобальные extensions Firstmate не копируются. При первом запуске Pi может запросить project trust — установка не одобряет его автоматически.

Запуск после установки:

```bash
~/.pi/agent/bin/firstmate
```

Можно отдельно добавить `~/.pi/agent/bin` в свой PATH. Установщик не переписывает shell profile и не меняет уже существующую команду `firstmate` из другого места. Это convenience wrapper, не отдельный Firstmate CLI: он входит в checkout и выполняет `pi`. Лаунчер добавляет private backend tools в PATH только своему процессу, выбирает установленный agent directory и отдельный FM_HOME, не наследуя указатели root/config/state/data/projects от другого Firstmate home. Для работы с GitHub отдельно выполните `gh auth login`; его авторизация не переносится из текущей машины. Установка не запускает Firstmate, Herdr agents, fleet, MCP tool calls или платные запросы модели.

Store identity зависит от объявленных версий, lock и patch. Повторная установка сверяет Firstmate HEAD/отсутствие tracked изменений и hashes backend binaries. Она не перезаписывает чужие launchers, links, изменённые provider/skills или незавершённый store. Переключение с уже установленного другого managed stack требует отдельного решения о миграции runtime, а не скрытой замены checkout.

## Инструкции и личная конфигурация

`configs/APPEND_SYSTEM.md` содержит прежний native `start_task_session` контракт **вне Firstmate**. В supervisor-сессиях Firstmate действует его lifecycle, включая instructions от tools/очереди; автоматический native handoff только из-за новой цели не требуется. Запрет бросать незавершённую работу/проверки остаётся во всех сессиях. Постоянная строка обязательного Herdr-package routing удалена.

Pi может заменить глобальный APPEND проектным. Поэтому `configs/AGENTS.md` содержит переносимый раздел Firstmate и обязательное согласование существенного увеличения ресурсов/работы непосредственно с пользователем: согласие на цель не разрешает любые способы, а supervisor не может дать такое согласие вместо пользователя. Полный ресурсный абзац в новых source templates находится только в AGENTS, а не дублируется в APPEND. Установщик проверяет все разделы до записи и добавляет только отсутствующие, без замены остальных байтов. Повторная установка не дублирует разделы. Отличающийся одноимённый раздел или symlink требует ручного review, а не автоматического исправления. Если сохраняемый пользовательский APPEND уже содержит тот же ресурсный абзац, он остаётся нетронутым: в обычной сессии возможен повтор; перенос этого абзаца при развёртывании согласуется отдельно. Локальные правила машин/SSH не являются исходником этого template.

Для AGENTS, MCP, AITunnel и трёх skills manifest устанавливает `snapshotRuntime: false`, `restore: false`. Maintenance сохраняет portable templates и не импортирует вместо них личный runtime; generic `restore-configs` не заменяет пользовательские варианты. Их initial/explicit installation выполняется отдельными guarded шагами install.sh. Остальные существующие managed snapshots сохраняют прежний контракт.

Установка MCP добавляет только отсутствующие server names и сохраняет существующие записи. Source paths адаптируются к agent directory. Credentials не извлекаются из локальной установки:

- `paper-search` доступен через `<agent>/bin/paper-search-mcp`, stdio, codemode. Не публикуйте сервер наружу; HTTP/OAuth конфигурация и локальные незакоммиченные изменения проекта не переносились. PDF/tool возможности используйте только для законно доступных источников.
- `jev-browser` доступен через `<agent>/bin/jev-browser`. Новый default **выключен**, пока пользователь отдельно не предоставит `OPENROUTER_API_KEY` и не включит entry; конфигурация содержит только environment placeholder. Существующий пользовательский entry не выключается и не перезаписывается. Вызовы браузера могут расходовать средства и читать содержимое открытых страниц.
- AITunnel читает `$AITUNNEL_API_KEY`. Ключ и авторизация задаются отдельно; default provider/model автоматически на него не переключаются. Значения cost в регистрации — рубли AITunnel за 1M tokens, хотя Pi отображает итог как USD; это не проверенные долларовые расходы. Метаданные модели сохранены из локальной регистрации, live advertised limits/качество не подтверждались.

## Paper-search: воспроизведение установленного варианта

Установленная версия называлась `0.1.4`, но `server.py` отличался от Git HEAD и от dirty working tree. Только installed-code delta находится в `stack/paper-search-installed.patch`. Он меняет зарегистрированные пользовательские названия/описания Sci-Hub entry на имеющиеся в установленном варианте nice-Hub и не включает текущие незавершённые исправления проекта. После применения и после wheel installation проверяется SHA-256 целевого модуля из `stack/lock.json`.

Runtime dependencies закреплены по версиям, Python — по patch version, npm transitive dependencies — по lock integrity. Это воспроизводимость выбранного кода/состава, **не** обещание побайтно идентичных wheel/build artifacts: Python build backend и platform libraries отдельно не заморожены. Доступность upstream/download endpoints не гарантируется.

## Backup, rollback и проверки

Backup/restore allowlist включает AGENTS, новый source-installed provider, только SKILL.md трёх style skills и три launchers. Соседние пользовательские файлы в папках этих skills не удаляются при rollback. Legacy backups по-прежнему принимаются только по точным известным наборам путей. При ошибке installer восстанавливает управляемые файлы. Независимые checkout, backend installation и agent data не удаляются.

`<agent>/stack` намеренно **не** входит в удаляемый rollback/uninstall allowlist: там после запуска может быть Firstmate runtime. Успешные и незавершённые stores сохраняются для разбора, даже если остальная установка откатилась. При checksum/build ошибке launcher не активируется; повторная попытка на incomplete store останавливается и требует review. Автоматической очистки или миграции данных нет.

`npm test` проверяет portable policy/private snapshots, instruction/MCP preservation, offline bootstrap с подменёнными downloader/package managers, реальную SDK-сборку с project APPEND precedence, provider/skills, native discovery/resume и retained обязательные gates. Отдельный clean-sandbox bootstrap может проверить реальные downloads/install metadata без запуска агентов. Ни один offline gate не доказывает доступность live MCP/провайдера, совместимость реального fleet, качество ответов, cache hit rate или ускорение.
