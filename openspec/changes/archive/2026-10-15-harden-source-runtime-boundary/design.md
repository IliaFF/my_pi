## Context

Первый baseline change уже archived после passing suite, но staging review выявил пробел в ignore и недостаточную fixture isolation. Не переписывать историю под видом прежнего PASS.

## Decisions

Использовать basename ignore `node_modules` для directory и symlink, root-only `/context-fold/` для runtime store (не скрывать одноимённые будущие specs). В fixture сначала запомнить абсолютный foldSource, затем переопределить HOME и PI_CODING_AGENT_DIR и восстановить оба в finally. SessionManager.inMemory(...).getSessionDir() возвращает нормализованный пустой путь, то есть process.cwd(); это root cause утечки. Использовать SessionManager.create(testHome, testHome), а не подменять SDK method. Existing sandbox cleanup остаётся.

## Risks / Trade-offs

Ignore не заменяет release content scan. Native/subprocess network sandbox остаётся вне scope. Нельзя удалять production store: очищается только synthetic source/context-fold, созданный предыдущими тестами этой миграции.
