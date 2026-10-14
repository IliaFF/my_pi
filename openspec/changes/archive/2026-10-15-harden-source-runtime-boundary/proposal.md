## Why

Git review обнаружил, что directory-only ignore не исключает symlink `node_modules`. Standalone SDK compaction test также сохранял seed indices в source/context-fold: SessionManager.inMemory нормализует пустой sessionDir в process.cwd(), смена HOME/agent env это не меняет. Это могло включить runtime data и абсолютные локальные ссылки в baseline commit.

## What Changes

- Добавить regression на Git boundary для dependencies, cache, credentials и artifacts.
- Игнорировать dependency symlinks и root context-fold runtime store.
- Использовать явный temporary sessionDir, изолировать и восстанавливать PI_CODING_AGENT_DIR; проверять ledger внутри sandbox.
- Portable release должен отклонять context-fold runtime root.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `build-governance`: exclusion работает для symlink и нового runtime store.
- `build-validation`: standalone integration не пишет вне sandbox.

## Impact

.gitignore, compaction test, portable release scan и boundary self-test. Только source/test isolation, production не изменяется. Уже созданные synthetic fixture indices удалить до commit.
