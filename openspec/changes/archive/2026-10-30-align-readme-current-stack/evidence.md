# Verification evidence

## Scope
Исходная база: f4318b0843c59e12ca14f0cbfd0de38e7e1067c5, чистый worktree. Изменены только README и документы этого docs-only change; runtime/config/code/tests не менялись. Позднее пользователь явно согласовал push README после успешных проверок.

## Checks
- Ручная сверка README с npm/package.json, configs/AGENTS.md, configs/APPEND_SYSTEM.md, docs/portable-stack.md и существующими specs: исправлены две версии, Herdr/Firstmate, handoff, checkout command и исторический статус CI/runtime evidence.
- npx --no-install openspec validate align-readme-current-stack --strict --no-interactive: PASS, skip_specs: true.
- npm test: PASS, exit 0, все 25 стадий включая SDK integration и RPC startup. Background job b9ea05b55; результаты test-results/results.json и stage logs локальные/ignored. Проверки выполнены после изменения README, до добавления этого evidence и архивирования change.
- git diff --check: PASS; полный README diff и все owned change documents просмотрены, посторонних изменений нет.

## Limitations
Нет behavioral change, отдельный regression test не создавался. Offline gate не доказывает live доступность MCP/providers, качество, производительность или состояние личного runtime. CI нового commit не проверен. Установка runtime не выполнялась. После архивирования финальная OpenSpec validation: 19/19 PASS; git diff --check: PASS. Финальные изменения после полного gate — только evidence/tasks и уточнение разрешённого push в proposal/design; README не менялся.
