# TODO

## In progress
- [ ] Разгрузить стек: Canary/tools удалены из release и active; release/isolated install/runtime probes PASS, 20 dependencies/2 patches. FFF оставлен по benchmark; Caveman/RPIV патчи нужны. Quota OpenAI-only ограничение описано в docs/stack-review.md. Active/isolated RPC rc=0, stderr empty, 58 commands; safe updater dry-run failures=0 warnings=0. Осталось отправить изменения.

## Blocked

## Completed
- [x] Обновить сборку до Pi 0.99.2 и последних npm extensions: exact lock, unpinned settings, RPIV patch 2.12.0 и TODO-only task recovery. Release и isolated install PASS; verify failures=0 warnings=0; RPC rc=0, stderr empty, 58 commands. Release 2ca8de7 отправлен в origin/main и сверен с remote. Известные upstream npm audit/peer ограничения описаны в README.
- [x] Актуализировать сборку по active Pi 0.87.1: обновлены exact lock и 12 extensions, порог compaction 170k, default-off `tools.ts`, patch RPIV 2.11.0; release, dry-run, isolated install/verify и fresh RPC PASS; отправлено в `origin/main`.
- [x] Синхронизировать текущую Pi-сборку с `IliaFF/my_pi`, проверить и отправить в `origin/main`
