# Разгрузка стека Pi 0.99.2

## Удалено

- `pi-canary`: не загружался. Удалены dependency/lock entry, patch и dormant config.
- Локальный `tools.ts`: уже был выключен. Удалены source, manifest entry, settings exclusion и тесты удалённого extension. Installer удаляет старый файл при миграции. Direct tools и `recall_folded`/`unfold` остаются у прежних владельцев.

20 direct npm dependencies вместо 21; два version-gated patches вместо трёх.

## Оставлено после проверки

- **pi-fff**: заметный выигрыш тёплого поиска; fuzzy query `packlock` находит `npm/package-lock.json`. Native `find` — glob, а не fuzzy finder. Измерены реальные tool `execute`, не только системные команды.
- **Caveman**: `/caveman`, уровни, session persistence и настройки не заменяются статической инструкцией. Проверка включает переключение prompt и исключение stale UI в animation timer; patch остаётся нужен.
- **RPIV**: structured questionnaire остаётся отдельной функцией. Runtime probe проверяет отсутствие `ask_user_question` сразу после `session_start` без UI и возврат при наличии UI. `tool_search` сам не проверяет пригодность анкеты для клиента; startup patch оставлен.
- **pi-zai-usage**: оставлен для текущего `openai-codex`. Проверка с fake model registry показала ограничение: OpenAI-only credentials для модели `gpt-6.1-sol` не распознаются `1.1.0`, `hasCodexAuth=false`, `getCodexUsage` возвращает `codex-no-auth`. Это НЕ тест реального OAuth/сети. Новый OpenAI login не включался; переносить quota footer туда пока нельзя без upstream fix/отдельной адаптации.

## Измерение поиска

Медиана 7 вызовов после инициализации; одинаковые glob/pattern/limits. FFF сортирует результаты иначе, поэтому это проверка скорости и доступности функций, не доказательство полного равенства результатов.

| Каталог | Операция | Native, ms | FFF, ms |
| --- | --- | ---: | ---: |
| Клон сборки | find `*.ts` | 8.32 | 0.62 |
| Клон сборки | grep `import` в `*.ts` | 8.65 | 2.52 |
| Рабочий проект | find `*.ts` | 41.76 | 0.52 |
| Рабочий проект | grep `import` в `*.ts` | 63.28 | 3.35 |

FFF startup + initial index в этих запусках: 342/193 ms. Это локальные замеры Node 24/WSL, не гарантия для любого проекта; холодный запрос включает цену индексации. Benchmark печатает только timings/sizes, не содержимое файлов.

## Проверено

- Release/security/pristine patch replay: PASS, 20 direct dependencies, 2 patches.
- Isolated install и active surface probes: PASS; quota limitation воспроизведено без сети.
- Active и isolated RPC: exit=0, stderr empty, 58 commands; `/tools` отсутствует, `/caveman`, `/context-fold`, `/queue` сохранены.
- Active maintenance и `pi-update-safe --dry-run`: failures=0, warnings=0. Symlink safe updater теперь указывает на active agent maintenance, не старый manifest.
- Personal settings/авторизация/модель сохранены; изменён только retired `tools.ts` exclusion. Local audit snapshot отражает personal defaults; release сохраняет переносимые defaults.

## Повторение проверок

```bash
python3 scripts/test-release.py
node scripts/test-stack-surface.mjs ~/.pi/agent
node scripts/compare-search.mjs "$PWD" ~/.pi/agent
```

`install.sh` запускает surface probe после patch/verify. Тесты не обращаются к провайдеру, не используют реальные credentials и не меняют авторизацию. Перед benchmark выберите проект с TypeScript-файлами и строками `import`.

Секреты, runtime databases, sessions и backup в release не входят. Известная upstream `brace-expansion` audit issue этой разгрузкой не исправляется.
