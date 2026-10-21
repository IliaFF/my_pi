# Tasks

## 1. Preparation

- [x] Прочитать AGENTS и затронутые specs; создать OpenSpec change до изменения pins.
- [x] Проверить baseline: три отличающихся pin; regression-first не применим, это обновление версий без bug fix.

## 2. Candidate

- [x] Обновить exact pins и runtime lock без изменения membership/scripts/allowScripts.
- [x] Выполнить npm ci --ignore-scripts --legacy-peer-deps здесь для tooling/runtime.
- [x] Проверить все 19 exact target versions и неизменность protected файлов.

## 3. Validation and evidence

- [x] Выполнить полный неизменённый npm test с PASS.
- [x] Проверить полный доступный diff и записать версии, результаты, ограничения и отсутствие CI/deployment.
- [x] Архивировать после PASS в 2026-10-21-autoupdate-a1c642761be7 без изменения существующих specs/history.
