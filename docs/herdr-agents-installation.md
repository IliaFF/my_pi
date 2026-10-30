# Установка Herdr agents и sidebar в сборку

## Состав и причина

Пользователь явно согласовал установку после [изолированной проверки реального spawn/sidebar](herdr-sidebar-integration.md). В portable npm/settings закреплён `pi-herdr-agents@3.3.1`. Оба компонента берутся из одного exact npm package, включая `plugins/sidebar`, без второго плавающего GitHub install.

Published tarball integrity: `sha512-c0s1zKTc5EpLibHkLM/ZZxiYNuPfyQgR/t1WWNmLuYG2FafDjPw8p4z8UFQv1dB+Rfsax/d/vTuiYnMZqqYFUw==`. Каталоги `pi-extension`, `maestro`, `plugins/sidebar` в npm tarball побайтово совпали с tested clean Git SHA `8864764e65a469f7d90f9a0deb39ec3f0b26befc`.

Консервативный `configs/herdr-agents/config.json`:

```json
{
  "status": { "enabled": true },
  "sidebar": { "enabled": true },
  "persistent": { "maxAgents": 1 }
}
```

Модель, provider, роли и tool allowlist не навязываются. Sidebar не включает Focus сам. Fresh installer создаёт конфиг только при отсутствии; maintenance и повторная установка не перетирают пользовательские настройки. Backup/rollback поддерживает новую config path и прежние exact path sets.

## Применение на существующем хосте

**Не запускать полный `install.sh` только ради этого дополнения.** В личном runtime есть дополнительные пакеты/настройки, отсутствующие в portable baseline. Нужны scoped addition и backup.

1. Сохранить приватно `npm` целиком, settings, инструкции, maintenance и имеющиеся Herdr registry/config. Зафиксировать отсутствие новых путей и проверить digest/читаемость архива до изменений.
2. После source gate установить exact пакет в существующий store, не заменяя его package.json/lock исходниками сборки:

```bash
cd pi-build
npm install --prefix "$AGENT_DIR/npm" --save-exact pi-herdr-agents@3.3.1 \
  --ignore-scripts --legacy-peer-deps --no-audit --no-fund
```

3. Атомарно добавить единственную декларацию `npm:pi-herdr-agents@3.3.1` в реальные settings, сохраняя все остальные поля/package objects. Merge только `status.enabled`, `sidebar.enabled`, `persistent.maxAgents` в Herdr config. Если политика multi-window ещё не присутствует в личном APPEND_SYSTEM, добавить соответствующий source block, сохраняя остальное содержимое.
4. Проверить exact version и sidebar source, затем связать уже установленный каталог:

```bash
herdr plugin link "$AGENT_DIR/npm/node_modules/pi-herdr-agents/plugins/sidebar"
herdr plugin action list --plugin pi-herdr-agents.sidebar
```

`plugin link` регистрирует обе кнопки, не вызывает Focus/All. Путь остаётся стабильным при последующих exact npm installs. Удаление npm package требует предварительного `herdr plugin unlink pi-herdr-agents.sidebar`.

5. Проверить fresh offline loading source и рабочего профиля без модели/paid calls, отсутствие дубликатов и сохранность остальных зависимостей/полей. Проверить проектные overrides отдельно; не переписывать их автоматически. Синхронизировать versioned maintenance из Git-источника, не редактировать установленную копию вместо source.

## Installed не означает loaded

Текущие сессии и Herdr server не перезапускаются. Новый Pi загрузит расширение; для уже открытого Pi нужен отдельный пользовательский `/reload`. Маркер получают новые дети после загрузки расширения; ранее запущенные дети автоматически не переписываются. Не объявлять существующую беседу оснащённой новыми tools до reload.

Focus/All доступны вручную через Herdr actions. Focus меняет отображение Agents view всего server и скрывает только корректно помеченные безопасные статусы. Blocked/unknown остаются видимыми. TTL/смена occupant могут давать краткую задержку. Ни sidebar, ни worktree не ограничивают права процесса.

## Откат

Backup хранится вне Git с приватными правами. Перед восстановлением проверить SHA256SUMS, identity host/agent, перечень изменённых файлов и отсутствие новых изменений после установки. Если пользователь позднее редактировал настройки, не заменять их вслепую — merge/remove только добавление.

Для немедленного scoped rollback: unlink только `pi-herdr-agents.sidebar`, восстановить проверенные pre-state npm/settings/instructions/config/maintenance и исходный plugins.json, если он существовал; если новый config/registry отсутствовал до установки, удалять его только после проверки отсутствия посторонних новых записей. Не восстанавливать sessions, auth или весь Herdr server state; не вызывать Focus/All и не перезапускать server. Сохранённые ссылки npm остаются в архиве как ссылки.

## Evidence и ограничения

Исходный baseline `0a7ba93`; task `be4fcb241200`. Source regression до adoption: два FAIL; изменения добавляют exact pin/default config, bootstrap preservation и совместимость rollback с предыдущим набором. Runtime backup/deployment и итоговые gate результаты фиксируются в OpenSpec evidence и root TODO.

При аудите layout registry дополнительный lab server корректно прекратил работу, но helper отказал в немедленном удалении из-за transient EACCES при чтении `/proc/572001/environ`. Поздняя read-only проверка показала отсутствие PID/server. Каталог `/tmp/piha-herdr-lab-LSG93x` оставлен как диагностический residue; его не удаляли обходом ownership refusal. Это не рабочий Herdr server и не препятствие установке.

Проверенная синтетическая механика не доказывает автономное решение задачи больше одного управляемого окна, семантическую сохранность всех ограничений или live-provider recovery. Persistent specialist после собственного сбоя не оживает автоматически. Правило делегирования >1 управляемого окна и запрет агентов через shell-only background pilot не изменяются.
