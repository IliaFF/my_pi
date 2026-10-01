# TODO

## In progress
- [ ] Синхронизировать Pi 0.99.2 и последние расширения с активной установкой. Release и isolated install PASS; verify failures=0 warnings=0; RPC rc=0, stderr empty, 58 commands. Осталось отправить в origin/main.

## Blocked

## Completed
- [x] Актуализировать сборку по active Pi 0.87.1: обновлены exact lock и 12 extensions, порог compaction 170k, default-off `tools.ts`, patch RPIV 2.11.0; release, dry-run, isolated install/verify и fresh RPC PASS; отправлено в `origin/main`.
- [x] Синхронизировать текущую Pi-сборку с `IliaFF/my_pi`, проверить и отправить в `origin/main`
