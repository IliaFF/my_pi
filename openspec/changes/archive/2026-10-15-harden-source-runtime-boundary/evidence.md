# Evidence — 2026-10-15

- RED `python3 -m unittest discover -s tests -p '*_test.py'`: exit 1, 16 tests / 1 failure. Git не исключал `node_modules`, `npm/node_modules` и `context-fold/fixture/seed-index.jsonl`.
- После добавления release scan: expected exit 1, `forbidden path in release: context-fold/.../seed-index.jsonl`.
- Попытка изолировать только HOME/PI_CODING_AGENT_DIR осталась RED: `compaction ledger must be inside fixture agent`. Root cause уточнён чтением upstream: SessionManager.inMemory передаёт пустой sessionDir, normalizePath превращает его в process.cwd(); context-fold пишет относительно getSessionDir.
- Исправление: SessionManager.create(testHome, testHome), fixture agent env с восстановлением в finally, ledger assertion внутри sandbox; bare node_modules ignore (directory + symlink), root-only /context-fold/ ignore, portable release scan runtime store.
- Удалены только synthetic fixture indices из нового source/context-fold: перед удалением проверены filename seed-index.jsonl, JSON и `Keep exact intent` во всех records. Production store не читался/не удалялся.
- GREEN unit: 16 tests, OK. Public manifest/lock/OpenSpec/CI files не скрываются ignore rules.
- Standalone `PATH=<locked bin> PI_CODING_AGENT_DIR=<source> python3 scripts/test-release.py <source>`: exit 0; fresh registry patch replay PASS, после запуска source/context-fold отсутствует. SDK compaction records теперь persist только в temporary session files.
- Полный `npm test`: exit 0, 12 этапов PASS. Без модели в compaction, faux provider в loop integration, реальный RPC startup без prompt. Никакие production dependencies или configs не изменены.
- Git staging review исключает node_modules symlinks, test-results, cache, credentials и runtime stores. Remote CI job по-прежнему не запускался; подготовлен и локально проверен workflow.

Это отдельное исправление после первого archived change; прежний PASS не объявляется доказательством ещё не проверенного staging boundary.
