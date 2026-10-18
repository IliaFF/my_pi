# Design

## Context

Это version-only обновление без намеренного изменения поведения. Все 19 dependency names уже существуют; только pine-of-glass отстаёт от целевой версии. Защищённые settings подготовлены контроллером. Рабочая копия предоставлена без .git, поэтому revision/CI не могут быть заявлены как подтверждённые.

## Decisions

- Применить exact pin 0.18.0, пересчитать runtime lock через npm с ignore-scripts и legacy-peer-deps. Затем выполнить npm ci с теми же flags для обоих dependency trees.
- Не включать lifecycle scripts, не менять allowScripts и не выполнять package-manager update всех зависимостей. Изменения transitive graph принимать только как следствие выбранного pin и проверять diff.
- Сохранить существующий четырёхкомпонентный observability allowlist. Upstream features сами по себе не основание менять конфигурацию.
- Выполнить неизменённый npm test: strict OpenSpec, unit, patch replay/apply/verify, actual SDK integrations и RPC startup. Для version-only обновления failing bug regression не требуется; несоответствие 0.17.0 целевой 0.18.0 уже установлено до правки.
- Архивировать только после полного PASS через OpenSpec с --skip-specs, чтобы оставить защищённые specs нетронутыми; delta сохраняется в архиве для контроллера.

## Risks and limits

Transitive package/API drift может нарушить загрузку, schemas или Meantime lifecycle. Gate должен обнаружить это без credentials/provider traffic. При необходимости защищённых правок остановиться, сохранив незавершённый change. Полный gate не доказывает live rendering, Chrome, SSH, provider latency или Codex subscription transport. Deployment и CI выполняются отдельно контроллером.

## Rollback

До принятия release вернуть только изменённый pin/lock и документацию; текущий host не изменяется. Runtime backup/install/rollback здесь не запускаются.
