# Design

## Context

Разрешённое обновление npm baseline без новых возможностей. Изменяются browser-use 0.1.31 → 0.1.32, Ponytail 5.3.2 → 5.3.3, Markdown Preview 0.24.0 → 0.25.0, Web Access 0.44.0 → 0.45.0 и pine-of-glass 0.18.3 → 0.18.4. Остальные пятнадцать exact pins уже совпадают с targets.

## Goals / Non-Goals

Сохранить локальные patches, lazy/deferred tool contracts, discovery, session lifecycle, queue и offline SDK regressions. Не добавлять features, зависимости, lifecycle scripts, personal data или deployment.

## Decisions

- Использовать только npm read access и существующий OpenSpec CLI; установка через `npm ci --ignore-scripts --legacy-peer-deps`.
- Regenerate runtime lock с прежними package names и allowScripts. По возможности сохранить прочие transitive resolutions.
- Перенести три versioned patches с минимальными изменениями контекста upstream; сначала проверить применимость без ослабления контрактов.
- Full `npm test` является обязательным gate; при необходимости изменения protected files остановиться, не обходить ошибку.
- Архивировать в заданный dated archive вручную после PASS, не переписывая canonical specs/history. Git metadata отсутствует в sandbox; commits/acceptance принадлежат controller.

## Risks

Upstream может менять patch context или поведение. Проверки настоящего SDK, patch replay и isolated RPC startup остаются неизменными. Без credentials нельзя утверждать проверку Chrome/SSH/provider или реального TUI. CI и production deployment не выполняются.

## Validation

Сверить все 20 targets, lock, manifest и patch names. Выполнить strict OpenSpec validation и весь npm test. Evidence содержит результаты, ограничения и review scope, но не runtime logs.
