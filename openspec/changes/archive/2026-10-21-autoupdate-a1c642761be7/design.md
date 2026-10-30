# Design

## Context

Это extension-only обновление: 19 прямых зависимостей, три отличающихся pin. Core/TUI, installer и patched packages уже на целевых версиях. Изменение поведения не запрашивалось; failing regression до правок не требуется для штатного обновления версий.

## Decisions

- Менять только три значения dependencies в npm/package.json и генерировать lock через npm с --ignore-scripts --legacy-peer-deps; затем чистый npm ci с теми же flags.
- Не выполнять lifecycle scripts и не расширять allowScripts. Изменения транзитивных зависимостей проверить по lock.
- Использовать существующий full gate с настоящим SDK, patch replay и RPC smoke, без credentials/model requests. Новые test assertions или ослабления недопустимы.
- При требуемом protected изменении остановиться, записать blocker и не архивировать.
- Архивировать через OpenSpec с --skip-specs: существующие main specs защищены; delta остаётся в архиве для контроллера.

## Risks and validation

Upstream может изменить регистрацию tools, package resources или transitive зависимости. Обязателен полный npm test и проверка exact installed pins; успешный offline gate не доказывает live Chrome/SSH/provider поведение. CI и production acceptance выполняет контроллер отдельно.

## Rollback

Deployment отсутствует. Отклонённый candidate не затрагивает установленный runtime. Controller управляет Git и acceptance; локально не создавать commit/push.
