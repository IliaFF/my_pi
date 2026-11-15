# my_pi — сборка Pi с маршрутизацией OpenRouter

Сборка ставит ядро Pi 1.5.2 из npm, расширение SSH-маршрутизации `pi-ssh-remote@0.1.15` с патчем, глобальную команду `/providers` и ежечасную пересборку маршрута модели DeepSeek по цене кеш-чтения на OpenRouter.

## Состав

| Путь | Назначение |
| --- | --- |
| `npm/package.json`, `npm/package-lock.json` | точные пины: `@earendil-works/pi-coding-agent@1.5.2`, `@earendil-works/pi-tui@1.5.2`, `pi-ssh-remote@0.1.15` |
| `patches/pi-ssh-remote+0.1.15.patch` | патч расширения SSH-маршрутизации |
| `configs/settings.json` | провайдер/модель по умолчанию и пакет `npm:pi-ssh-remote@0.1.15` |
| `configs/models.json` | override маршрута OpenRouter для `deepseek/deepseek-v4.1-flash-1017`: `order`, `allow_fallbacks: false`, `quantizations: ["fp8"]`, цены, `maxTokens: 65536`. Только провайдер `openrouter`, ключей и чужих провайдеров нет |
| `configs/systemd/openrouter-cache-order.service`, `.timer` | ежечасный прогон `openrouter-cache-order.mjs`, `TimeoutStartSec=120` |
| `configs/AGENTS.md` | локальные заметки о хостах этого ПК; в сборку не входят, `install.sh` копирует только при отсутствии `~/.pi/agent/AGENTS.md` |
| `extensions/providers/index.ts`, `data.mjs` | глобальная команда `/providers`: цены, скорость и маршрут апстримов текущей модели |
| `scripts/openrouter-cache-order.mjs` | пересобирает `compat.openRouterRouting`, `cost` и `maxTokens` в `~/.pi/agent/models.json` |
| `scripts/openrouter-cache-order.test.mjs`, `scripts/providers.test.mjs` | офлайн-тесты ранжирования и команды `/providers` |
| `scripts/verify-cache-routing.mjs`, `scripts/verify-providers-command.mjs` | сквозные проверки: тело запроса Pi содержит `provider.order`; `/providers` отдаёт таблицу |
| `scripts/verify-rpc.mjs` | настоящий CLI-прогон `remote` и `/remote` после установки |
| `install.sh`, `uninstall.sh` | установка с backup и откат |

## Установленные расширения

Состояние живого `~/.pi/agent`: 15 npm-пакетов из `settings.json` и два локальных расширения. `install.sh` из этого репозитория ставит только `pi-ssh-remote`; остальные пакеты ставятся отдельно и закрепляются в `~/.pi/agent/npm/package.json`.

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
| `auto-ultra-compact` | `~/.pi/agent/extensions/auto-ultra-compact/index.ts`, в репозитории отсутствует | авто-уплотнение контекста при заполнении окна |

## Установка

```bash
./install.sh --dry-run                 # план без изменений
./install.sh --install-core            # ядро Pi, пакеты, патч, конфиги, проверка remote
./install.sh --preserve-settings       # не перезаписывать существующий settings.json
./uninstall.sh --backup ~/.pi/my-pi-backups/<stamp>   # откат
```

`install.sh` не ставит расширение `providers`, `models.json` и systemd-юниты — они кладутся вручную:

```bash
ln -s "$PWD/extensions/providers" ~/.pi/agent/extensions/providers
cp configs/models.json ~/.pi/agent/models.json
cp configs/systemd/openrouter-cache-order.* ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now openrouter-cache-order.timer
```

`systemctl --user show openrouter-cache-order.service -p TimeoutStartUSec` должен показать `2min`.

## Маршрут DeepSeek

`scripts/openrouter-cache-order.mjs` берёт `GET /api/v1/models/deepseek/deepseek-v4.1-flash-1017/endpoints`, отбрасывает апстримы без `quantization: fp8`, с flex/priority/spot-тирами, со `status != 0` и со слагами из `BROKEN_TAGS` (`stepfun/fp8` отдаёт 400 `input_invalid` на наборе инструментов), сортирует по цене кеш-чтения, затем по входу и выходу, и пишет топ-3 в `order`. `allow_fallbacks: false`; цены учёта берутся у первого провайдера списка, потому что Pi считает расход по `model.cost`, а не по `usage.cost` OpenRouter.

Запрос идёт с таймаутом 20 с, запись — под lock-файлом `models.json.lock` (устаревание 5 минут) и с уникальным по pid временным файлом; обновляются только `order`, `allow_fallbacks`, `quantizations`, `cost.input/output/cacheRead`, `maxTokens`, остальные поля `compat` и `cost` сохраняются. Отказ маршрута (ни один провайдер из `order` не доступен) — остановка с явной ошибкой и вопрос о переходе на дефолтный роутинг OpenRouter.

Ручной прогон — `node scripts/openrouter-cache-order.mjs`, проверка без записи — `--dry-run`.

## Команда `/providers`

Каждый вызов заново запрашивает `/endpoints` текущей OpenRouter-модели с авторизацией через ModelRegistry и печатает таблицу: цена входа/выхода/кеша USD за миллион, `throughput_last_30m.p50`, настроенный маршрут. По умолчанию топ-10 по цене кеша плюс исключённые строкой «Скрыто: ещё N»; `/providers all` показывает всех с колонкой типа. Вывод идёт через custom entry: в контекст модели не попадает и настройки не меняет. После правки `models.json` применить модель к сессии: `/model`, дождаться обновления, подтвердить выбор.

## Проверки

```bash
node scripts/openrouter-cache-order.test.mjs   # PASS rankProviders, PASS topCost
node scripts/providers.test.mjs                # PASS /providers: prices, throughput, route, errors
node scripts/verify-cache-routing.mjs --config # PASS provider.order из живого models.json
node scripts/verify-providers-command.mjs      # PASS команда /providers
node scripts/verify-rpc.mjs ~/.pi/agent        # PASS установка и remote
```

## Ограничения

- Провайдеры и авторизация не настраиваются: их нужно подключить вручную после установки.
- Патч закреплён за `pi-ssh-remote@0.1.15`; при обновлении пакета патч пересобирается.
- `configs/models.json` содержит только override `openrouter`; полные настройки провайдеров и ключи в репозитории не хранятся.
- Проверено на локальном Linux (WSL2).