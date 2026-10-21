# Сокращение контекста: согласованный этап 1

## Граница результата

Изменяются только исходники `pi-build/`. Развёртывание, обновление личного runtime и push не выполняются. Исходный Git HEAD: `70232350455c1b82ce4a1ffc77e12a85132547f9`, worktree был чистым до создания change. Корень `fresh_pi` не является Git-репозиторием; его `TODO.md` — authoritative очередь.

### Исходный видимый набор этой сессии

21 объявление в `functions`: `read`, `bash`, `edit`, `write`, `tool_search`, `start_task_session`, `task_queue`, `context_search`, `context_get`, `context_export`, `ask_user_question`, `recall_folded`, `unfold`, `bg_run`, `bg_status`, `bg_logs`, `bg_kill`, `grep`, `find`, `web_enable`, `codemode`.

Отдельно виден `multi_tool_use.parallel`: всего 22 операции. MCP tools доступны через discovery; это не список всех зарегистрированных возможностей. Автоматический список содержит 9 skills: `cpp-styleguide`, `latex-simple-style`, `openalex-literature-search`, `python-styleguide`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`, `ponytail-review`. Базовый Ponytail уже не рекламируется в активном full.

Это наблюдение входного контекста, не дамп HTTP запроса и не замер его токенов. Установленный runtime не изменён, поэтому видимый набор этой сессии сам по себе не сократился.

## Четыре пункта

1. **Codemode / parallel.** `defaultTools` уже включает `+codemode`, mode остаётся `on`, чтобы не скрывать остальные tools. В исходниках bundled `pi-coding-agent`/`pi-ai` и Git-сборки нет регистрации `multi_tool_use.parallel`; поиск по доступному codemode `ALL_TOOLS` также вернул ноль таких имён. В данной сессии wrapper поставляет внешний harness. Удалить его схему средствами этого репозитория нельзя. Это ограничение, а не выполненное скрытие и не инструкция «не пользоваться». Codemode уже является единственным пакетным инструментом реестра сборки; для внешнего wrapper нужна настройка владеющего им harness/API, которого в этом Git-источнике нет.
2. **Web loader.** Патч `pi-web-access@0.43.0` убирает из активных объявлений только `web_enable`, когда активны все настроенные tools именно этого пакета. Проверяет loadout при старте/смене ветки, перед новым run и после tool results; обычная активация также сразу пересчитывает loader. Поэтому работает и native `tool_search` для configured deferred exposure. Исполнитель loader остаётся зарегистрирован; если capability стала неактивной, loader возвращается. Переименованные/отключённые tools учитываются; произвольный MCP browser не считается заменой capabilities пакета. Не меняются web executor, permissions, параметры и сетевые действия. Удаление объявления может вызвать штатный transcript checkpoint на adapter: сохранение prefix/cache для этого удаления не обещается.
3. **Ponytail.** Только help/gain/debt получают `disable-model-invocation: true`. Обе формы `/ponytail-help` и `/skill:ponytail-help` (аналогично gain/debt) сохранены. Review/audit, базовые режимы, остальные skills и loader resources не удаляются. Без расширения работают native `/skill:` команды; aliases принадлежат расширению и без него не обещаются.
4. **Инструкции.** APPEND больше не повторяет длинный handoff-контракт `start_task_session`; остаётся короткая ссылка и запрет бросать незавершённую работу. Background guidelines больше не повторяют default wake дважды и правила inspection по три раза. Сохранены process-only, локальное unsandboxed выполнение, deadlines/caps, exact-scope evidence, opt-outs, no polling, исключения для inspection, cancellation и ограничения reload. TODO ordering, markers и compaction-only contract сохранены. Встроенные описания recall/unfold и внешний системный prompt не переписываются; другие tools/skills не сокращаются.

## Воспроизводимые замеры

`node scripts/measure-stage-one-context.mjs .` измеряет UTF-8 байты трёх **раздельных** компонентов. SDK `loadSkillsFromDir`/`formatSkillsForPrompt` рендерят advertisement с одинаковыми `/fixture/skills/...` путями; base skill исключён с обеих сторон, как в active full. Для background измеряется JSON массива исходных guideline-строк четырёх process tools, не полный provider prompt. Скрипт содержит assert-проверки структуры/диагностик.

| Компонент | До | После | Разница |
| --- | ---: | ---: | ---: |
| `configs/APPEND_SYSTEM.md` | 3982 | 3345 | −637 |
| Ponytail advertisement, normalized paths | 2550 | 1526 | −1024 |
| Background guidelines JSON | 1721 | 1196 | −525 |
| Число background guidelines | 11 | 7 | −4 |

Не складывать это в точный размер полного model request: там есть иное форматирование, другие инструкции и схемы. Оставшиеся review/audit advertisements неизменны.

Для независимого повторения baseline: извлечь Git HEAD выше в отдельный временный checkout; скопировать туда **тестовые**, не пользовательские зависимости из `npm/node_modules`; обратить новые patches к pristine и применить baseline patches по `git show <baseline>:patches/<name>`. Для Ponytail обратный новый patch уже возвращает baseline frontmatter трёх skills; baseline patch восстанавливает прежние base/review/audit правки. Для background сначала обратить новый patch целиком, затем применить baseline patch. Запустить этот же measurement script с аргументом пути к baseline checkout; core/versions должны быть одинаковыми. Не запускать maintenance с личным agentDir. В исходной проверке использовались временные копии `/tmp/pi-stage1/`, нормализация устраняет вклад длины путей.

`node --require ./scripts/no-network.cjs scripts/test-web-loader-sdk.mjs npm/node_modules` захватывает реальные контексты faux provider, воспроизводит lazy/activated и resumed/partial/eager/deferred-discovery случаи. В fixture с переименованным search и двумя отключёнными capabilities собственное JSON-объявление loader занимает **314 байт**. До исправления оно присутствует и после enable; после — отсутствует. Это не общая экономия между lazy и enabled запросами: там одновременно добавляются реальные web declarations. В исходном регрессионном fixture без tool_search имена до enable: read/bash/edit/write/web_enable; после baseline enable к ним добавлены research_search/get_search_content, loader остаётся. В окончательном тесте tool_search присутствует с самого начала, после enable удаляется только loader и добавляются эти два web tools.

## Регрессии и ограничения

До реализации actual SDK test Ponytail завершился exit 1 на `help must be command-only`. Actual web SDK test завершился exit 1 на `Redundant loader must not reach next provider request`. Дополнительная регрессия deferred discovery сначала завершилась exit 1 на `Discovery must also remove redundant loader`; hook `tool_result` устранил причину.

Обязательные проверки используют временные HOME/agent/cwd и faux provider, без credentials и реальных search/fetch/model calls. Первый полный gate дал 18/20 PASS: harness/release требовали сохранения короткой фразы `Ask the user if uncertain` непосредственно в APPEND; фраза возвращена без длинного дубликата. SDK checks проверяют настоящие prompt/command/tool lifecycle, не только строки исходников. Скрипт web regression подключён к существующему native discovery gate. Полный npm gate после правки: 20/20 PASS, exit 0; review и точные checks записаны в OpenSpec evidence. Финальный snapshot-bound gate повторяется после archive/commit; его результат фиксируется в корневом TODO.

Не измерены токены реального запроса, live cache hits, latency, качество ответов, внешняя схема wrapper или эффект после deployment. Личные настройки, ключи, модели Ollama и установленная maintenance не меняются. При будущей отдельно согласованной установке уже пропатченные пакеты той же версии следует сначала восстановить/переустановить до pristine, а не применять новый cumulative patch поверх старого. CI remote job не запускался.
