# Tasks

## 1. Failing regression

- [x] 1.1 Добавить sandbox SSH fixture и regression script с настоящим pi-ssh-remote/Pi SDK по образцу test-deferred-tools-sdk.mjs; получить и записать FAIL Windows connect на исходном POSIX timeout/cd/pwd, без credentials или внешних соединений.

## 2. Shell-aware connection and execution

- [x] 2.1 Расширить repository patch: ограниченная shell probe, shell state и establish/reconnect/chdir без POSIX-зависимостей для cmd.exe; проверить cwd с пробелами, неверный cwd, unsupported shell и сохранение прежнего cwd при ошибке в fixture.
- [x] 2.2 Согласовать tool/slash exec, quoting cwd, deadline/abort/error cleanup и Windows exit codes; проверить SDK identity, ненулевой exit, 124/137, зависший канал, отмену, output limits и POSIX remote timeout; добавить edge-case asserts на metacharacters в cwd.
- [x] 2.3 Оставлять стандартные инструменты локальными на Windows и явно показывать routing в connect/status/model context; проверить через SDK Windows → POSIX переход и отсутствие запуска Unix filesystem helpers на Windows. Документировать cmd.exe-only scope, timeout и routing limits в README или существующем remote разделе.

## 3. Integrated verification and evidence

- [x] 3.1 Подключить regression к scripts/test-build.py с конечным deadline; выполнить полный npm test на изолированной установке с действующими patch-verify, SDK и RPC gates, сохранить точный результат.
- [x] 3.2 Проверить полный собственный diff и новые файлы против начального состояния, выполнить git diff --check и strict OpenSpec validation; записать версии, FAIL→PASS, CI/live/Unicode ограничения в evidence.md. Не включать исходные пользовательские изменения TODO.md, credentials или test-results в commit исходников/spec/tests.

## Workflow follow-up

- После PASS всех tracked tasks согласовать архивирование change; runtime пока не устанавливать.
- Установку runtime согласовать отдельно, сделать backup и reload/restart; затем согласованно проверить remote connect/exec на Windows командами whoami/hostname без изменения Windows-настроек.
