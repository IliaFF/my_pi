# Design

## Context

Мотивация — proposal.md. Проверен установленный pi-ssh-remote 0.1.15: withRemoteTimeout используется в execRemote, execRemoteLimited и remoteBashOps. establish и changeRemoteCwd, tool exec и slash exec отдельно составляют POSIX cd/pwd. mkdir и MIME probe также зависят от Unix. Существующий repository patch меняет только deferred exposure; SDK-test проверяет discovery/status, но не SSH connect/exec.

## Goals / Non-Goals

**Goals:** исправить весь путь connect → cwd → exec для Windows cmd.exe с сохранением POSIX поведения и security checks SSH.

**Non-Goals:** новый транспорт SSH, изменение парсера ProxyCommand, PowerShell-профиль, полноценная Windows filesystem-routing реализация, установка runtime. Контракт — specs/remote-shell-execution/spec.md.

## Decisions

1. Расширить существующий package patch. Не редактировать первично ~/.pi/agent и не добавлять зависимости. Сохранить deferred exposure и текущие trust/auth/jump-host проверки.
2. Ввести минимальный shell discriminator в состоянии соединения. При establish выполнить ограниченную безопасную probe без POSIX timeout: сначала проверить default shell cmd.exe сырым `echo __PI_REMOTE_CMD__%OS%&& cd` с однозначным маркером и cwd, затем POSIX probe. Нельзя запускать probe через cmd.exe: этот бинарник доступен и из PowerShell, что ошибочно подтвердило бы совместимость default shell. Не определять shell только по SSH banner; auth/transport errors не маскировать fallback. При reconnect определять shell заново, а не доверять устаревшему сохранённому значению.
3. Использовать общую сборку cwd/command для establish/chdir/tool exec/slash exec. Для cmd.exe — Windows смена диска и каталога и quoting путей; входные cwd со спецсимволами нельзя без проверки вставлять в команду. Поддержать пробелы и отклонять неподдерживаемые опасные формы явно, не выполнять частичную команду. POSIX quote и timeout оставить прежними. Одной замены timeout недостаточно: последующий cd/pwd всё равно ломает connect.
4. Windows timeout обеспечивается локальным таймером SSH channel; завершение promise не должно ждать бесконечно события close после deadline/abort. Очищать timer/listeners на всех путях. Не трактовать Windows exit 124/137 как POSIX timeout. Закрытие канала ограничивает ожидание, но не гарантирует остановку дерева процессов Windows; это ограничение показывать в документации.
5. Для Windows сохранять стандартные инструменты локальными и показывать routing в connect/status и model context. Это меньше и безопаснее, чем заодно переписывать SFTP mapping, mkdir/file MIME helpers и bash adapters. При переходе на POSIX не сохранять случайно Windows routing guard.
6. Regression: локальный SSH server fixture на существующем ssh2 принимает настоящие каналы от настоящего package, эмулирует cmd.exe/POSIX ответы и отвергает Unix-обёртку на Windows. Запускать реальные remote calls через Pi SDK, переиспользуя sandbox/Jiti/faux provider подход scripts/test-deferred-tools-sdk.mjs. Отдельные чистые asserts подходят для quoting, но не заменяют SDK integration. Fixture — не Windows: live whoami/hostname остаётся отдельной проверкой.

## Risks / Trade-offs

- [Удалённый процесс переживёт deadline] → не обещать remote kill; явно документировать, не использовать live destructive commands.
- [cmd quoting и command injection через cwd] → edge-case tests; невалидные пути отклонять до исполнения, не упрощать escaping молча.
- [Windows code page] → для обязательного live smoke достаточно ASCII identity; полную Unicode-кодировку не заявлять проверенной.
- [PowerShell или нестандартная shell] → не угадывать поддержку по успешной SSH-аутентификации; понятная ошибка при неподдерживаемой среде.
- [Локальный routing неожиданен] → явно показывать в status и инструкциях; не изображать полный Windows filesystem support.

## Migration Plan

Сначала failing regression на исходном package, затем source patch, полный npm test и diff review. Записать версии и evidence; commit source/spec/tests без runtime/credentials/test-results. Не архивировать до PASS всех задач. Установка только после отдельного согласования, с backup по docs/diagnostics-and-rollback.md; загруженное расширение требует reload/restart. Live Windows smoke — только read-only identity после согласования установки.
