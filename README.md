# my_pi — чистая сборка Pi

Ветка `clean-pi`: ядро Pi 1.5.2 из npm, `pi-ssh-remote` с патчем, локальное расширение `auto-ultra-compact` и патч `context-fold` на эффективное окно 170k. Прочие локальные расширения, skills, MCP-серверы и агентские политики прежнего стека живут в его истории.

В `configs/AGENTS.md` сохранены только описания удалённых хостов и правил подключения через `remote`.

## Состав

| Путь | Назначение |
| --- | --- |
| `npm/package.json`, `npm/package-lock.json` | точные пины: `@earendil-works/pi-coding-agent@1.5.2`, `@earendil-works/pi-tui@1.5.2`, `pi-ssh-remote@0.1.15` |
| `patches/pi-ssh-remote+0.1.15.patch` | патч расширения SSH-маршрутизации |
| `patches/context-fold+0.8.0.patch` | fold-порог, шаг ladder и бюджет считаются от эффективного окна 170000 |
| `skills/` | глобальные skills: `cpp-styleguide`, `latex-simple-style`, `writing-python`, `remote-hosts` |
| `local-extensions/auto-ultra-compact/index.ts` | автосжатие на 170k токенов, последние 20000 остаются как есть, после сжатия — продолжение по текущему плану |
| `configs/settings.json` | 15 пакетов, `+codemode`, `cacheWarming: idle`, deepseek на `max`, `compaction.keepRecentTokens: 20000` |
| `scripts/verify-fold-window.mjs` | проверка патча context-fold на установленном пакете |
| `configs/AGENTS.md` | хосты `office`, `iii`, уберкомп, `agentVPS` и правила `remote` |
| `install.sh` | установка: backup, `npm ci`, патчи, extension, skills, конфиги, проверка |
| `scripts/verify-rpc.mjs` | настоящий CLI-прогон: `remote`, `/remote`, нет ошибок расширений |

## Установка

```bash
./install.sh --dry-run                 # план без изменений
./install.sh --install-core            # установить ядро и конфиги
./install.sh --preserve-settings       # не перезаписывать существующий settings.json
./uninstall.sh --backup ~/.pi/my-pi-backups/<stamp>   # откат
```

`install.sh` делает backup в `~/.pi/my-pi-backups/<stamp>` и при ошибке возвращает прежние файлы. Проверка после установки: `node scripts/verify-rpc.mjs ~/.pi/agent` (запускается самим `install.sh`) и `node scripts/verify-fold-window.mjs ~/.pi/agent`.

Сжатие: `auto-ultra-compact` запускает сжатие при 170000 токенов и после него просит модель продолжить текущую задачу по `TODO.md` проекта или очереди Firstmate; `compaction.keepRecentTokens: 20000` оставляет последние 20000 токенов как есть; `context-fold` считает порог 45% и шаг 12% от того же эффективного окна (≈76k и ≈20k), а не от окна провайдера.

## Ограничения

- Провайдеры и авторизация не настраиваются: их нужно подключить вручную после установки.
- Патч закреплён за версией `pi-ssh-remote@0.1.15`; при обновлении пакета патч нужно пересобрать.
- Проверено только на локальном Linux; других платформ в этой ветке нет.
