# Что заимствовать из rpiv-telemetry и rpiv-todo

Проверен код [rpiv-mono, revision 1ffa165](https://github.com/juicesharp/rpiv-mono/tree/1ffa165/packages/rpiv-telemetry), package version 2.13.8. Это оценка реализации, а не подтверждение работоспособности MLflow на нашем хосте. Зависимости, сервер и расширение не устанавливались; существующий loop-profiler не менялся.

## Короткий вывод

Не переносить пакет целиком. Он полезен как образец доставки диагностических событий и построения дерева операций, но у нас уже есть большая часть нужных измерений. Ближайшее разумное развитие — локальный просмотр существующего opt-in trace и явные parent-связи, если для этого появится конкретная диагностическая задача. Не вводить универсальный dispatcher/экспортёр заранее.

## Что уже есть у нас — не дублировать

`local-extensions/loop-profiler.ts` уже записывает duration, token/cost counters, время инструментов, model/active-tool/other/overlap phases, HTTP status/response time, первую assistant delta, nested/direct границы и результаты проверок. Постоянный aggregate ограничен 5 MiB/500 runs; подробный trace включается отдельно через PI_PROFILE=1. Raw marks уже содержат run/turn/request, tool id и direct/nested boundary. Они фиксируют размеры и имена, а не отправляют полные аргументы/результаты во внешний сервис.

`pi-token-speed` и Meantime отдельно закрывают видимую скорость и текущий темп. Ни MLflow, ни ещё один набор счётчиков для этих функций не нужны. Наличие измерений не доказывает их точность во всех сценариях; это сопоставление кода, а не повторный live-аудит profiler.

## Полезные идеи и условия применения

| Идея и место в upstream | Что взять для нас | Когда имеет смысл |
| --- | --- | --- |
| `dispatcher.ts`: bounded FIFO, drop-oldest, warning/recovery transitions | При будущей асинхронной доставке ограничивать не только количество, но и байты; считать dropped events; предупреждать при переходе failed/recovered, а не на каждом событии | Если появится реально медленный sink. Сейчас не заменять компактную локальную запись dispatcher-слоем |
| `providers/mlflow/span-registry.ts`, `tool-spans.ts`: связи trace → tool | Сначала строить дерево из нашего trace. При необходимости добавить parentToolCallId в opt-in raw marks: сейчас хранится id и nested/direct boundary, но не явный parent id | Для локального viewer вложенных codemode вызовов, без экспорта текста |
| `instrumentation/finalize.ts`, `orphan-flush.ts`: сначала terminal events, затем drain, затем teardown | При любом новом trace sink сохранять незавершённые операции с явным incomplete/cancelled, потом ограниченный deadline на flush и отписку | Если вводится новый sink; не выдавать синтетическое завершение за реальный успех |
| `providers/index.ts`: тяжёлый provider за dynamic import | Не грузить необязательный exporter при старте без явного включения | Если exporter вообще понадобится; сейчас не добавлять зависимость |
| `attribute-events.ts`: типизированные scalar attributes вместо JSON blob | Держать измерения пригодными для фильтрации, с явно названными единицами и фазами | Наши aggregate fields уже в основном таковы; сохранить этот подход |

## Что не копировать и почему

1. **Экспорт tool args/result без privacy gate.** `providers/mlflow/tool-spans.ts` передаёт `event.args` в inputs и `event.result` в outputs. `llmPayload: off` относится только к provider request payload, а не к инструментам. Команды, прочитанные файлы и случайные секреты могут уйти на настроенный MLflow-сервер. Для нас разрешать только whitelist scalar metadata; не полагаться на regex-redaction после сбора.
2. **Название request duration без уточнения фазы.** `instrumentation/pi-handlers.ts` создаёт start на before_provider_request, end на after_provider_response. В установленном Pi 1.3.0 последний hook вызывается **до потребления response stream**. Значит этот span не измеряет всю streaming-генерацию или TTFT. У нас providerResponseMs уже отделён от first delta/model phase; при будущем viewer сохранить различие. Сам наш TTFT отсчитывается от начала run, не от каждого HTTP request — подписи тоже не смешивать.
3. **Неограниченный по времени shutdown dispatcher.** `Dispatcher.shutdown()` ждёт inFlight, затем flush/shutdown providers через Promise.allSettled. AllSettled изолирует rejection, но не ограничивает зависший Promise. В dispatcher нет общего deadline; downstream SDK может иметь свои таймауты, их поведение здесь не проверено.
4. **Готовый payload summarizer без адаптации.** В `payload-summary.ts` systemBytes вычисляется через JS string.length, то есть не UTF-8 bytes. Поля OpenAI Responses `input`, `instructions`, `max_output_tokens` не обрабатываются, хотя старые messages/system/max_tokens — да. Для нашего Codex endpoint нельзя переносить эти показатели как точные.
5. **Полный subagent/MLflow слой.** У нас действует process-only pilot, а чужая привязка к pi-subagents EventBus/Agent tool не даёт сейчас необходимой функции. Пакет private:true; требует rpiv-config и @mlflow/core, а trace-session-shim deep-imports внутренний trace_manager. Не добавлять этот долг ради неиспользуемого интерфейса.
6. **Терять события, но считать trace исчерпывающим.** Drop-oldest сохраняет работу агента под нагрузкой, но может потерять начало/конец span. Любое дерево по такой доставке должно явно показывать неполноту. Длина очереди также не является лимитом объёма payload в байтах.

## Что уже применено из rpiv-todo

Изучены `todo-overlay.ts`, `view/format.ts`, native expansion и lifecycle. Независимо реализованы tree-ветки, theme/status glyphs, текущая строка с выделением, горячая клавиша, точное число скрытых незавершённых строк и render-time адаптация к высоте/native tools-expanded. Сохранены наша файловая очередь, FIFO, одно текущее задание и защита поздних callback.

Не взяты session snapshots, второй tool/store, dependencies между задачами, настройка ради настройки, recently-completed tracking и процент done/total: наш TODO — долгоживущий журнал с большой Completed историей, поэтому такой процент описывал бы не текущую работу. Зачёркнутые Completed также противоречат прежнему требованию скрывать историю. Внешнее оформление заимствовано как идея, исходный код не копировался; upstream заявляет MIT.

## Проверки и границы

Синтетическая characterization-проверка выполнила настоящий pure summarizer и настоящий dispatcher с заменой только config dependency: UTF-16/UTF-8 различие и пропуски Responses-полей воспроизведены; очередь cap=2 сохранила события [1,4,5] при blocked first sink; shutdown ждал до явного освобождения sink, поздние события после shutdown не доставлялись. Вызовы сети блокировались. Локальные script/log: `reports/queue-panel-polish/telemetry-check.mjs` и `.log` вне portable Git.

Это **не** actual SDK/MLflow transport test и не доказательство утечки в запущенном сервисе: privacy вывод основан на явных inputs/outputs в коде. Сервер, долговечность trace, API токены, производительность, полная изоляция child sessions и все внутренние тесты upstream не проверялись. Никаких runtime/credentials изменений для оценки не было.
