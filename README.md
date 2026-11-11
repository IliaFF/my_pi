# my_pi — чистая сборка Pi

Ветка `clean-pi`: ядро Pi 1.5.2 из npm и одно расширение — `pi-ssh-remote` с патчем. Никаких других расширений, инструментов, skills, MCP-серверов и агентских политик здесь нет; прежний стек остался в `main`.

В `configs/AGENTS.md` сохранены только описания удалённых хостов и правил подключения через `remote`.

## Состав

| Путь | Назначение |
| --- | --- |
| `npm/package.json`, `npm/package-lock.json` | точные пины: `@earendil-works/pi-coding-agent@1.5.2`, `@earendil-works/pi-tui@1.5.2`, `pi-ssh-remote@0.1.15` |
| `patches/pi-ssh-remote+0.1.15.patch` | патч расширения SSH-маршрутизации |
| `configs/settings.json` | минимальные настройки: провайдер/модель и пакет `npm:pi-ssh-remote@0.1.15` |
| `configs/AGENTS.md` | хосты `office`, `iii`, уберкомп, `agentVPS` и правила `remote` |
| `install.sh` | установка: backup, `npm ci`, патч, конфиги, проверка |
| `scripts/verify-rpc.mjs` | настоящий CLI-прогон: `remote`, `/remote`, нет ошибок расширений |

## Установка

```bash
./install.sh --dry-run                 # план без изменений
./install.sh --install-core            # установить ядро и конфиги
./install.sh --preserve-settings       # не перезаписывать существующий settings.json
./uninstall.sh --backup ~/.pi/my-pi-backups/<stamp>   # откат
```

`install.sh` делает backup в `~/.pi/my-pi-backups/<stamp>` и при ошибке возвращает прежние файлы. Проверка после установки: `node scripts/verify-rpc.mjs ~/.pi/agent`.

## Ограничения

- Провайдеры и авторизация не настраиваются: их нужно подключить вручную после установки.
- Патч закреплён за версией `pi-ssh-remote@0.1.15`; при обновлении пакета патч нужно пересобрать.
- Проверено только на локальном Linux; других платформ в этой ветке нет.
