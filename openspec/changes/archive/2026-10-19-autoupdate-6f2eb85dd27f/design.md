# Design

## Context

Это dependency-only обновление без намеренного изменения поведения. Прочитаны build-validation, build-governance и vps-stack-updates specs. В baseline все targets, кроме pine-of-glass, уже совпадают; core/installer/patch metadata согласованы.

## Decisions

- Изменить pine-of-glass строго на 0.18.1; сохранить package names, scripts и allowScripts.
- Сгенерировать lock через npm с --ignore-scripts --legacy-peer-deps; затем выполнить npm ci с теми же флагами в runtime npm/.
- Не запускать lifecycle scripts или audit fix. Использовать существующий offline gate с настоящим SDK и faux/no provider.
- Архивировать через OpenSpec --skip-specs только после полного PASS; оставить delta в change, не изменяя защищённые openspec/specs.

## Risks

Upstream patch release может изменить lifecycle/UI. Неизменённые integration и RPC tests служат gate. Live UI, Chrome, SSH и provider работоспособность этим не доказаны. При необходимости защищённых правок остановиться, не ослабляя проверки.

## Validation

Проверить точные 19 pins и lock, полный npm test, отсутствие изменений защищённых файлов через исходные SHA-256, и итоговый allowlisted diff. Git metadata в sandbox отсутствует; commit/CI/acceptance принадлежат контроллеру. Bug regression не добавляется: это плановое dependency-only обновление, не исправление бага.
