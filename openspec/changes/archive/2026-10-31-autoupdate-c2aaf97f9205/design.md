# Design

## Context

Exact targets меняют browser-use 0.1.32 → 0.1.33, Preview 0.25.0 → 0.26.2 и Web Access 0.45.0 → 0.46.0. Все остальные прямые pins сохраняются. Подготовленные settings принадлежат controller.

## Decisions

- Использовать npm registry read и npm ci --ignore-scripts --legacy-peer-deps; не добавлять scripts или allowScripts.
- Перебазировать только существующие patch hunks на pristine npm packages; не убирать deferred tools, executors или loader reconciliation.
- Сохранить реальные SDK, patch replay и RPC smoke из полного npm test. При необходимости protected edits остановиться, не ослаблять gate.
- Хранить только агрегированные проверяемые результаты в evidence, не credentials/sessions/raw logs.

## Risks and rollback

Upstream может изменить bundled offsets или lifecycle. Проверка patch replay и actual SDK должна обнаружить несовместимость. Deployment отсутствует; controller принимает или отклоняет candidate, поэтому runtime rollback здесь не производится.

## Validation

OpenSpec strict validation, точная проверка всех direct targets и lock, полный npm test и обзор изменений. CI и live transports/provider behavior остаются непроверенными.
