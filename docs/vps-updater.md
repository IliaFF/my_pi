# Ежедневное обновление сборки на agentVPS

Это обновление **исходников my_pi**, не рабочей установки на ПК или VPS. Контроллер получает npm `latest`, запускает Pi/Codex под отдельным UID, переносит существующие патчи, проверяет кандидата и публикует его только после полного `npm test` и GitHub Actions для того же SHA. Main должен оставаться на исходном commit. Проверка direct-parent и явный lease на исходный SHA выполняют compare-and-swap; перезапись истории не разрешается даже при конкурентном изменении main. GitHub SSH-ключ и Hermes доступны только root-контроллеру, не агенту.

## Границы автоматизации

- Стабильные точные версии существующих runtime dependencies; core и TUI одной версии. Никаких новых пакетов, API-key fallback или новых lifecycle scripts.
- Агент может менять pins/lock, versioned patches, local extensions, Markdown документацию и один новый архивный OpenSpec change. Installer — только строку `PI_VERSION`. Managed configs, тесты, CI, инструкции и updater защищены. Перед repair контроллер сам синхронизирует в `configs/settings.json` только существующие exact npm-pins, совпадающие с baseline dependencies, с выбранными targets. Строковые declarations и `source` объектов обрабатываются одинаково; floating sources, selectors, состав/порядок пакетов и прочие настройки не меняются. Кандидат обязан сохранить подготовленные bytes и executable bit; иначе отказ до gate. Изменения за этими границами требуют ручного review, даже если действительно нужны для нового API.
- Отдельные UID `pi-update-agent` и `pi-update-test`. Второй не имеет OAuth. Файлы агента никогда не выполняются от root; его `.git` никогда не используется контроллером.
- `systemd` sandbox: read-only system, скрытые `/root` и `/home`, без capabilities, приватные tmp/devices, 3 GiB RAM, 256 tasks, 150% CPU. Job расположен на отдельном tmpfs 2 GiB; `/tmp` и `/var/tmp` — отдельные tmpfs по 512 MiB; агент 45 минут, gate 15 минут, ожидание CI 20 минут. Журнал этапа ограничен 64 MiB, старые журналы удаляются. После остановки workers tmpfs размонтируется. Outbound network нужен Codex/npm; полного сетевого sandbox нет.
- Один flock, максимум три repair attempts на сочетание base/targets. Pending CI возобновляется без нового вызова модели. Неотправленные Telegram сообщения сохраняются. Остановка/перезагрузка не разрешает обход checks.
- Для public `IliaFF/my_pi` GitHub API читается без токена; ошибки/rate limit блокируют merge. Branch protection не обходится. Модель не получает права самостоятельно публиковать изменения.

## Установка (только VPS, явное разрешение оператора)

Нужны systemd >=255, Python >=3.11, Git, существующие Node >=24, root GitHub SSH и установленный Hermes с Telegram home channel. Не используйте production checkout как рабочий каталог агента.

1. Передайте проверенные исходники в отдельный staging directory. Запишите `git status`, версии и хеши settings/auth существующих приложений **без вывода содержимого**. Не трогайте `/root/my_pi`, если там чужие изменения.
2. Из staging выполните `bash deployment/vps-updater/install.sh /path/to/existing/node24`. Скрипт создаёт собственный `/opt/my-pi-updater`, два системных пользователя и выключенный timer; повторную установку поверх существующей отклоняет. Node копируется, глобальный Pi не меняется. Lifecycle scripts при установке runtime запрещены.
3. Выполните **отдельный OAuth-вход ChatGPT subscription** через `/opt/my-pi-updater/node/bin/node /opt/my-pi-updater/runtime/login.mjs`. Helper использует публичный OAuth provider SDK, без вызова модели. Он печатает только URL входа и статус, не токены. Для браузера оператора предварительно пробросьте через SSH локальный `127.0.0.1:1455` на VPS `127.0.0.1:1455` (например, через `pi-ssh-remote forward`). Вход ограничен 14 минутами; порт не открывать в публичную сеть. После входа helper атомарно сохраняет OpenAI OAuth в `/var/lib/my-pi-updater/auth/.pi/agent/auth.json` (0600, root-only parents). Не передавать пароль, токены или callback URL в чат.
4. **Старый Codex OAuth не копировать в OpenAI provider.** Pi 1.3 использует другой grant с `chatgpt.tokens.use.direct`, динамическим `clientId` и `scopes`. Подмена provider key у legacy токена воспроизводит 401 `api.responses.write`; downgrade CLI без согласованного SDK также несовместим. Helper оставляет старый credential без изменений при отказе входа. Новый вход независим от авторизации root/ПК. Контроллер выдаёт credential только временному HOME агента; при сохранении refresh результата обязательно сохраняет `clientId` и `scopes`.
5. Проверьте unit files через `systemd-analyze verify`, реальный sandbox (UID, запрет `/root`, отдельный test HOME), полный gate от test UID и короткий Codex subscription prompt от agent UID. Отдельно проверьте `hermes send --to telegram` (реальное сообщение в настроенный home channel). Не выдавайте model output за доказательство работоспособности CI.
6. Сначала опубликуйте и проверьте исходный commit этой инфраструктуры: root/controller source должен совпадать с опубликованным проверенным baseline. Затем `python3 /opt/my-pi-updater/vps-updater.py check` — только discovery, без repair/merge. Включите `systemctl enable --now my-pi-updater.timer`. `Persistent=true` может запустить пропущенный daily tick сразу.

## Управление

```bash
systemctl list-timers my-pi-updater.timer
systemctl start --no-block my-pi-updater.service
journalctl -u my-pi-updater.service -n 40 --no-pager
cat /var/lib/my-pi-updater/latest-check.json
# state.json и logs/ приватные; содержимое model logs не отправлять в Git/Telegram.
systemctl stop my-pi-updater.timer my-pi-updater.service
python3 /opt/my-pi-updater/vps-updater.py cleanup
```

`check` сохраняет metadata discovery, не вызывает модель и не сливает pending candidate. Контроллер установлен вне checkout и не обновляет сам себя из сгенерированного кода. Для обновления controller/unit files: остановить timer/service, сделать root-only backup `/opt/my-pi-updater`, config/state и unit files, установить отдельно проверенную версию, проверить sandbox/gate, вернуть timer. Исходники из Git не заменяют автоматически установленный controller.

Если агент остановился и оставил текущий `openspec/changes/autoupdate-<id>/` без архива, контроллер сообщает `repair incomplete` и направляет к приватному agent log за причиной. Это не разрешение автоматически архивировать failed change или публиковать его. Модельный вывод не пересылается в Telegram; исходный blocker проверяет оператор.

После трёх неудач изучите приватный log и automation branch, если он уже был опубликован. Не сбрасывайте attempts вслепую. Новый release/base автоматически создаст новый fingerprint. Успешное слияние не доказывает поведение будущего релиза в production; установка рабочей сборки остаётся отдельным действием с backup/rollback по `diagnostics-and-rollback.md`.

## Откат

Остановить timer и service; проверить, что `my-pi-worker-*` завершены и job tmpfs отсутствуют. Восстановить только файлы этого updater из его backup. Не откатывать чужие auth/settings. Не делать reset/force-push main: при необходимости создать reviewed revert commit и пройти gate. Для полного удаления сначала сохранить приватное evidence/OAuth в безопасном месте; автоматического удаления пользователей или credentials нет.
