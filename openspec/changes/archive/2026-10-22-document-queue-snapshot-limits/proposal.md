# Proposal

## Why

Описание task_queue не предупреждает, что snapshot всего worktree может отказать на symlink/submodule даже вне изменённых файлов. После такого preflight агент может безрезультатно пытаться закрыть задачу через ручной evidence.

## What Changes

- Уточнить tool description: область snapshot, неподдерживаемые файлы, невозможность обхода записанного failed preflight через evidence.
- Запретить удаление ссылок и сужение области только ради обхода отказа; сообщать о препятствии.
- Не менять runtime-логику, параметры, тестовые fixtures и установленную копию.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

Нет. `skip_specs: true`: tooling documentation only, существующие требования `task-selection` не меняются.

## Impact

Только description в `local-extensions/todo-queue/index.ts` и артефакты change. Без dependencies, production установки и внешних запросов.
