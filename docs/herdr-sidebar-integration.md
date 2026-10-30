# Herdr agents + sidebar: реальная изолированная интеграция

## Вывод

**Связка прошла техническую проверку на нашей версии Pi и Herdr. Можно переходить к отдельно согласованной установке обоих компонентов.** Сейчас ни расширение, ни sidebar в рабочий профиль не установлены; production-настройки и текущие панели не менялись.

Это продолжение [сравнения Herdr и Durable](multiwindow-agent-evaluation.md). Проверка закрывает фактический spawn, наследование выбранного контекстного профиля, повторные сжатия, persistent lifecycle и sidebar. Она не доказывает автономную работу реальной модели над задачей больше одного управляемого окна.

## Версии и изоляция

- Исходная сборка: чистый `90f89ae`.
- Pi CLI `1.4.0`, Node `24.18.0`, Linux/WSL; Herdr CLI/server `0.9.3`.
- `pi-herdr-agents@3.3.1`, Git SHA `8864764e65a469f7d90f9a0deb39ec3f0b26befc`; sidebar взят из `plugins/sidebar` того же commit. Upstream исходники не менялись.
- Приватные HOME, XDG, config, sockets и plugin registry создаёт upstream `test/integration/herdr-lab.ts`. Нет наследования caller `HERDR_*`, production auth/history/config.
- Herdr Pi integration установлена только в приватный agent dir. CLI shim закрепляет настоящий Pi binary, `--offline`, `--no-mcp`, non-login shell и явный PATH.
- Тестовый provider — локальный HTTP SSE server на `127.0.0.1` со случайным портом, scripted replies и фиктивным ключом `lab-only`. Внешних model endpoints и credentials в профиле нет. Это не OS/network sandbox.
- Завершение lab server проверяет PID/start time/cmdline/HOME. Удаляются только созданные lab roots; неизвестные процессы/остатки helper обязан сохранить и сообщить как residue.

## 1. Sidebar: настоящий клиент и rendering

Запущен полный pinned upstream `test/integration/sidebar.test.ts`: **8 passed, 0 failed, 0 skipped**, exit 0, около 25 секунд. Тест использует два отдельных Herdr server: target и viewer с настоящим прикреплённым TUI client. Видимость проверяется по отрисованной Agents panel, не только через `agent.list`.

Проверены:

1. Plugin link из собственного каталога; Focus и All доступны, warnings нет.
2. Focus скрывает только помеченных idle/working детей; All восстанавливает строки. Blocked/unknown, родители и строки без правильного маркера остаются.
3. All не очищает view, принадлежащий другому инструменту, и сообщает об этом.
4. Маркер перестаёт продлеваться после выхода/приостановки настоящего Pi; следующий occupant не скрывается после очистки.
5. Два родителя независимо обновляют свои маркеры.
6. Непродлённый маркер исчезает после TTL 15 секунд.
7. Marker writer корректно сообщает об отсутствующей панели.
8. Unlink plugin снимает принадлежащий ему view.

Focus не включается автоматически и не останавливает детей: это фильтр отображения для всего server. Маркер привязан к pane, не к живому процессу; при смене occupant возможна краткая задержка очистки. Blocked/unknown остаются видимыми. Плагин не является границей безопасности.

## 2. Настоящий родитель → persistent-ребёнок

Повторяемый opt-in probe: `scripts/evaluate-herdr-spawn.mjs`. Он запускает настоящий родительский Pi в lab pane с pinned extension и через модельный `subagent` tool создаёт отдельный persistent Pi. SDK-фабрика напрямую ребёнка не подменяет.

Контекстный профиль включает реальные:

- `context-fold`;
- `local-extensions/auto-ultra-compact` из source сборки;
- `@spences10/pi-context`;
- Herdr Pi integration;
- `pi-herdr-agents` с `sidebar.enabled: true`.

Это выбранный профиль контекстной системы, **не копия всего production runtime**: браузеры, SSH, MCP, Telegram, codemode и прочие интеграции отдельно не проверялись.

Процедура:

```text
Родитель Pi ──subagent(persistent)──▶ ребёнок Pi
     ▲                                 │
     └────── result №1, ≤16000 chars ────┘
                                       │ /compact
                                       ▼
                             deterministic seed index №1
                                       │
Родитель ──subagent_send(task 2)────────▶│
     ▲                                 │
     └────── result №2, тот же session ──┘
                                       │ /compact
                                       ▼
                             deterministic seed index №2
                                       │
Родитель ──subagent_send(task 3)────────▶│
     ▲                                 │
     └────── result №3, тот же session ──┘
                                       │
Родитель ──subagent_stop────────────────▶ завершение
```

**Результат: PASS**, 14 запросов к локальному fake provider, из них ровно 3 child requests; внешних model requests — 0. После усиления assertions probe повторён успешно.

Проверки внутри probe:

- HTTP-запрос каждого задания ребёнка реально декларирует активные `recall_folded`, `context_search`, `context_get`, в том числе после каждого сжатия.
- Два ручных `/compact` создают две persisted compaction entries с `deterministic seed index`. Дополнительных child model calls на summary нет.
- Третье обращение к provider содержит сжатый context index.
- Все три результата автоматически приходят родителю; у них разные task IDs и один child session file. Model-facing result ограничен 16000 символами, даже когда synthetic child response больше 100000 символов.
- Между заданиями persistent child не пишет exit sidecar и остаётся тем же исполнителем; `subagent_stop` возвращает успешный tool result, после чего специалист исчезает из live agent list.
- Herdr сообщает child session file, и extension выставляет реальный `piha_delegated_v1=live` marker. Sidebar plugin связан с тем же private server; поведение rendered фильтра независимо покрыто полным upstream suite.
- Lab helper завершил собственные servers и удалил roots без residue. Отдельная проверка не обнаружила servers с тестовыми именами `context-spawn`, `sidebar-target`, `sidebar-viewer`.

## Воспроизведение

Из `pi-build/`, с установленными локальными зависимостями сборки и чистым checkout кандидата на указанном SHA:

```bash
# Только выбранные явно локальные тесты; не npm run test:integration против текущего server.
env -i PATH="$PATH" HOME="$EMPTY_HOME" \
  HERDR_BIN="$(command -v herdr)" PI_BIN="$(realpath "$(command -v pi)")" PI_OFFLINE=1 \
  node --test "$HERDR/test/integration/sidebar.test.ts"

env -i PATH="$PATH" HOME="$EMPTY_HOME" HERDR_BIN="$(command -v herdr)" \
  node scripts/evaluate-herdr-spawn.mjs "$HERDR"
```

Probe имеет ограниченные ожидания стадий и проверяет pinned SHA. Запускать с внешним finite timeout, допускающим ownership-checked cleanup; при принудительном убийстве самого test runner его `finally` может не выполниться. Не удалять сохранённый residue и не сигналить PID без проверки идентичности. В обязательном `npm test` проверяется синтаксис opt-in probe, а не запускаются дополнительные Pi/Herdr.

Транзитные логи вне Git:

- `/tmp/pi-herdr-sidebar-integration.log`, SHA-256 `5bd5fb666fa127a324586137e019b4cb994be0b2e22f432503ad001b2f31be13`.
- `/tmp/pi-herdr-spawn-context.log`, SHA-256 `211ef209e210684de5b3e8a2891cc0e75b8068aaf51ab561a76dbab2cc48852d`.

## Если согласуем установку

Нужны оба компонента на проверенной revision, а не плавающий latest:

```bash
pi install npm:pi-herdr-agents@3.3.1
herdr plugin install giuseppecrj/pi-herdr-agents/plugins/sidebar \
  --ref 8864764e65a469f7d90f9a0deb39ec3f0b26befc
```

Это справочные команды, **не выполненная production-установка**. В нашей сборке сначала нужны source manifests/config, backup и отдельное согласование применения. Herdr Pi integration должна присутствовать именно в agent directory родителя и детей. В существующий `herdr-agents/config.json` нужно merge `sidebar.enabled: true`, сохранив обязательный `status` и остальные настройки, затем reload и новые дети. Ранее запущенные дети автоматически не помечаются.

Focus/All включаются вручную:

```bash
herdr plugin action invoke pi-herdr-agents.sidebar.focus
herdr plugin action invoke pi-herdr-agents.sidebar.all
```

Не задавать детям узкий `read,bash` allowlist без контекстных инструментов. В текущем probe allowlist не ограничен: это проверка механики наследования, не готовая permission policy. Нужны только задачи, прогнозируемо превышающие одно управляемое окно; мелкие поручения остаются у родителя.

## Непроверенное и оставшиеся риски

- Нет реальной автономной задачи больше одного управляемого окна, cloud provider recovery, измерения качества, времени или стоимости. Два принудительных сжатия с synthetic output не равны такой задаче.
- Нет проверки полного production plugin/codemode/MCP набора и пользовательских roles/tool allowlists.
- Persistent specialist по-прежнему не восстанавливается автоматически после собственного падения; новый процесс — не продолжение старого специалиста. Sidebar этого не меняет.
- Нет тестов Windows-native, macOS, нескольких прикреплённых пользователей и удалённых серверов. Проверена Linux/WSL схема.
- Полный source gate и финальная фиксация отражены в OpenSpec evidence и authoritative root TODO. CI отдельно не запускался.
