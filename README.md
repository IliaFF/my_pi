# my_pi — сборка Pi с маршрутизацией OpenRouter

Установщик подключает полный профиль расширений Pi 1.5.2: 15 npm-пакетов и два локальных расширения. Маршрутизация DeepSeek и её таймер включаются отдельным флагом.

## Состав

| Путь | Назначение |
| --- | --- |
| `npm/package.json`, `npm/package-lock.json` | lockfile ядра Pi 1.5.2 и 15 пакетов |
| `patches/pi-ssh-remote+0.1.15.patch` | патч расширения SSH-маршрутизации |
| `configs/settings.json` | настройки по умолчанию |
| `configs/extension-profile.json` | зафиксированные версии 15 пакетов живого стека |
| `configs/models.json` | override маршрута OpenRouter для `deepseek/deepseek-v4.1-flash-1017`: `order`, `allow_fallbacks: false`, `quantizations: ["fp8"]`, цены, `maxTokens: 65536`. Только провайдер `openrouter`, ключей и чужих провайдеров нет |
| `configs/systemd/openrouter-cache-order.service`, `.timer` | ежечасный прогон `openrouter-cache-order.mjs`, `TimeoutStartSec=120` |
| `extensions/providers/index.ts`, `data.mjs` | глобальная команда `/providers`: цены, скорость и маршрут апстримов текущей модели |
| `extensions/auto-ultra-compact/index.ts` | автоуплотнение контекста |
| `scripts/openrouter-cache-order.mjs` | пересобирает `compat.openRouterRouting`, `cost` и `maxTokens` в `~/.pi/agent/models.json` |
| `scripts/openrouter-cache-order.test.mjs`, `scripts/providers.test.mjs` | офлайн-тесты ранжирования и команды `/providers` |
| `scripts/verify-cache-routing.mjs`, `scripts/verify-providers-command.mjs` | сквозные проверки: тело запроса Pi содержит `provider.order`; `/providers` показывает таблицу, закрепляет провайдера и сбрасывает маршрут |
| `scripts/verify-rpc.mjs` | настоящий CLI-прогон `remote` и `/remote` после установки |
| `install.sh`, `uninstall.sh` | установка с backup и откат |

## Установленные расширения

Установщик использует `npm ci` с lockfile и применяет патчи к `pi-ssh-remote`, `context-fold` и `pi-background-tasks`.

| Пакет | Версия | Назначение |
| --- | --- | --- |
| `pi-ssh-remote` | 0.1.15 | постоянные удалённые SSH-workspace: `remote`, маршрутизация `read`/`write`/`edit`/`bash` |
| `@monotykamary/pi-retry` | 0.11.4 | повтор запросов на 400/413 и сетевых ошибках |
| `@spences10/pi-context` | 0.3.1 | локальная SQLite-боковина для крупного вывода инструментов |
| `context-fold` | 0.8.0 | свёртка устаревшего вывода инструментов без потери содержимого |
| `pi-web-access` | 0.47.0 | `web_search`, `fetch_content`, клонирование репозиториев, PDF, видео |
| `@dietrichgebert/ponytail` | 5.3.3 | режим минимального решения |
| `@juicesharp/rpiv-ask-user-question` | 2.15.0 | структурированные вопросы пользователю |
| `pi-token-speed` | 0.12.0 | измерение токенов в секунду |
| `pi-fast-resume` | 1.4.19 | быстрый выбор сессии по заголовкам без полного разбора файла |
| `pi-workspace-history` | 0.5.2 | откат и восстановление правок вместе с разговором |
| `pi-background-tasks` | 2.6.10 | фоновые shell-задачи, делегирование, Fusion |
| `@beyona/pi-zai-usage` | 1.1.0 | расход Z.ai, DeepSeek, Codex, Opencode Go |
| `pine-of-glass` | 0.18.4 | наблюдаемость сессий |
| `pi-markdown-preview` | 0.26.4 | рендер Markdown и LaTeX в терминал, браузер и PDF |
| `@ff-labs/pi-fff` | 0.11.0 | нечёткий поиск по путям и содержимому |

Локальные расширения:

| Расширение | Источник | Назначение |
| --- | --- | --- |
| `/providers` | `extensions/providers/` этого репозитория | цены, скорость и маршрут апстримов текущей OpenRouter-модели |
| `auto-ultra-compact` | `extensions/auto-ultra-compact/` этого репозитория | авто-уплотнение контекста при заполнении окна |

## Установка

Требования: Linux, Node.js 24+ и Pi 1.5.2. Если Pi ещё не установлен, добавьте `--install-core`.

```bash
./install.sh --dry-run
./install.sh --install-core
./install.sh --preserve-settings
./install.sh --preserve-settings --with-openrouter
./uninstall.sh
```

`--preserve-settings` сохраняет существующие параметры, сторонние записи пакетов и их фильтры. Версии пакетов из профиля фиксируются по lockfile. Без флага `settings.json` заменяется настройками сборки. Дерево `npm` пересобирается, сохранённые сторонние пакеты Pi подключит при следующем запуске с доступом к npm. Авторизация выполняется отдельно через `/login`.

`--with-openrouter` обновляет только запись целевой модели в `models.json` и запускает пользовательский таймер systemd. Требуется активный пользовательский менеджер systemd. Если одноимённый юнит уже есть, установщик остановится до изменений. Обычная установка не меняет `models.json` и systemd.

`uninstall.sh` восстанавливает последний резервный снимок изменённых файлов; `--backup DIR` выбирает конкретный снимок. Профиль проверяется через настоящий Pi RPC без вызова модели. Откат не снимает глобально установленное ядро Pi.

## Маршрут DeepSeek

`scripts/openrouter-cache-order.mjs` берёт `GET /api/v1/models/deepseek/deepseek-v4.1-flash-1017/endpoints`, отбрасывает апстримы без `quantization: fp8`, с flex/priority/spot-тирами, со `status != 0` и со слагами из `BROKEN_TAGS` (`stepfun/fp8` отдаёт 400 `input_invalid` на наборе инструментов), сортирует по цене кеш-чтения, затем по входу и выходу, и пишет топ-3 в `order`. `allow_fallbacks: false`; цены учёта берутся у первого провайдера списка, потому что Pi считает расход по `model.cost`, а не по `usage.cost` OpenRouter.

Запрос идёт с таймаутом 20 с, запись — под lock-файлом `models.json.lock` (устаревание 5 минут) и с уникальным по pid временным файлом; обновляются только `order`, `allow_fallbacks`, `quantizations`, `cost.input/output/cacheRead`, `maxTokens`, остальные поля `compat` и `cost` сохраняются. Отказ маршрута (ни один провайдер из `order` не доступен) — остановка с явной ошибкой и вопрос о переходе на дефолтный роутинг OpenRouter.

Ручной прогон — `node scripts/openrouter-cache-order.mjs`, проверка без записи — `--dry-run`.

## Команда `/providers`

В терминале `/providers` открывает список с ценами за миллион токенов, скоростью `p50` и текущим маршрутом. Выбор закрепляет один апстрим без fallback до сброса или смены модели. `Esc` оставляет маршрут без изменений.

- `/providers all` показывает полный каталог, включая исключённых из маршрута.
- `/providers use <слаг>` закрепляет провайдера из списка без диалога.
- `/providers reset` возвращает маршрут из конфигурации. С него же начинается новая сессия.

Команда запрашивает свежий `/endpoints` через ModelRegistry, кроме сброса. Таблица остаётся вне контекста модели. Выбор не меняет `models.json`.

## Проверки

```bash
node scripts/openrouter-cache-order.test.mjs   # PASS rankProviders, PASS topCost
node scripts/providers.test.mjs                # PASS /providers: prices, throughput, route, errors
node scripts/verify-cache-routing.mjs          # provider.order в запросе к локальной заглушке
node scripts/verify-providers-command.mjs      # /providers на временном профиле
node scripts/verify-cache-routing.mjs --config # отдельная проверка provider.order из рабочего models.json
node scripts/verify-rpc.mjs ~/.pi/agent        # PASS установка и remote
bash scripts/test-install.sh                   # чистая установка, фоновые задачи, контекст и откат
```

## Ограничения

- Провайдеры и авторизация не настраиваются: их нужно подключить вручную после установки.
- Патч закреплён за `pi-ssh-remote@0.1.15`; при обновлении пакета патч пересобирается.
- `configs/models.json` содержит только override `openrouter`; полные настройки провайдеров и ключи в репозитории не хранятся.
- Проверено на локальном Linux (WSL2).