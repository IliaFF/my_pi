# Tasks

## 1. Regression first

- [x] 1.1 До правок добавить в `scripts/test-portable-stack.mjs` контракт «контур отсутствует в сборке»: нет `local-extensions/jev-review`, нет записи в `managed` и в `manifest.json`, нет его проверок в `scripts/test-build.py`; зафиксировать точный FAIL до исправления.

## 2. Remove the layer from source

- [x] 2.1 Удалить `local-extensions/jev-review` и убрать установку/манифест/обязательные этапы gate; сохранить `extensions/jev-review` в allowlist `uninstall.sh` для исторических бэкапов с комментарием.
- [x] 2.2 Обновить спеки: retire capability `deepseek-workflow-assistance`, удалить требования `portable-user-stack` и `build-validation`; targeted tests должны стать PASS.

## 3. Verification

- [x] 3.1 Выполнить полный `npm test` и `openspec validate --all --strict`, проверить полный owned diff, включая удалённые и новые файлы; записать команды, версии и ограничения в `evidence.md`.
- [x] 3.2 Архивировать change и закоммитить исходники вместе с дельтами спек; production-установку не выполнять в рамках change.
