# Tasks

## 1. Safe rollback and regression

- [x] 1.1 Добавить минимальный sandbox regression настоящего uninstall.sh с installer state и `.bin/jiti -> ../jiti/lib/jiti-cli.mjs`; до source fix сохранить failing exit/ошибку и неизменность agent, затем проверить восстановленные bytes/link target/executable bits и unmanaged sentinel.
- [x] 1.2 Исправить uninstall.sh: полностью проверить и распаковать payload в приватный staging до удаления файлов, разрешать только внутренние managed links, проверять destination parents и восстановленный результат; tests на обычные symlinks/hardlinks, traversal, absolute/outside/chained links, unmanaged target, FIFO, missing/truncated payload и existing symlink parents должны PASS с безопасным отказом.
- [x] 1.3 Перевести error trap install.sh на тот же rollback с явным сообщением отказа и сохранением original failure/core rollback; sandbox execution должен подтвердить успешный restore и незамаскированный restore failure без network/production agent. Обновить docs/diagnostics-and-rollback.md: staging, backup scope, ограничения atomicity и отличие archive safety от provenance.

## 2. Mandatory acceptance

- [x] 2.1 Подключить реальный rollback regression в scripts/test-build.py, не удаляя другие gates; выполнить полный npm test, strict OpenSpec validation, syntax checks и review всего owned diff относительно initial state; записать версии, результаты, отказ первой установки из-за inherited environment и ограничения в evidence, commit source/spec/tests без runtime/logs/keys.

## 3. Approved runtime recovery and patch-only deployment

- [ ] 3.1 Исправленным rollback восстановить согласованный pre-install backup; подтвердить исходные config/package-lock/package hashes и dependency versions. Если восстановление/проверка неуспешны, явно остановиться без следующей задачи; личные данные не включать в source evidence.
- [ ] 3.2 С отдельным backup применить только source SSH delta к соответствующему pi-ssh-remote 0.1.15 baseline и его точечным maintenance metadata; подтвердить unchanged hashes/pins остальных dependencies и private settings, настоящий installed SDK regression, live whoami/hostname и disconnect. Записать границы проверки и необходимость reload/restart; завершить текущую TODO-задачу только после PASS.

## Workflow follow-up

- Архивировать только после всех PASS и отдельного запроса.
- После завершения установки перейти к следующей независимой TODO-задаче через start_task_session; не начинать Canary/500k/prewarming в текущей незавершённой установке.
