# Spec Delta

## Purpose

Обеспечить явные и проверяемые правила подключения и исполнения remote-команд на POSIX и Windows cmd.exe без изменения настроек удалённой ОС.

## ADDED Requirements

### Requirement: Shell-aware connection and directory
Remote SHALL определять поддерживаемую оболочку до shell-зависимой инициализации cwd. Windows cmd.exe SHALL поддерживать connect, reconnect и chdir без Unix-утилит; неподдерживаемая оболочка SHALL давать понятную ошибку без активного remote routing.

#### Scenario: Windows connection
- **WHEN** Windows cmd.exe endpoint успешно аутентифицирован
- **THEN** connect определяет каталог без bash, timeout и pwd; reconnect повторяет определение оболочки

#### Scenario: Windows directory change
- **WHEN** chdir получает существующий Windows-путь с пробелами
- **THEN** новый cwd сохраняется и используется последующими exec; несуществующий путь не заменяет прежний cwd

#### Scenario: Unsupported shell
- **WHEN** endpoint не проходит проверку поддерживаемой оболочки
- **THEN** соединение завершается диагностикой, а локальные инструменты не перенаправляются

### Requirement: Shell-aware bounded execution
Tool и slash exec SHALL выполнять команды с одинаковой shell-семантикой и cwd. Windows SHALL использовать локальный deadline без Unix timeout. Вывод SHALL оставаться ограниченным; ненулевой exit code SHALL быть ошибкой, а не успешным пустым результатом.

#### Scenario: Identity verification
- **WHEN** Windows exec запускает `cmd.exe /c "whoami & hostname"`
- **THEN** возвращаются обе строки без POSIX-обёртки

#### Scenario: Deadline and cancellation
- **WHEN** Windows-команда зависает или запрос отменён
- **THEN** локальное ожидание и канал завершаются в ограниченное время; результат не обещает остановку удалённого процесса

#### Scenario: Windows exit code
- **WHEN** Windows-команда возвращает 124 или 137 до локального deadline
- **THEN** результат сообщает exit error, а не ошибочно распознанный POSIX timeout

#### Scenario: POSIX compatibility
- **WHEN** connect, chdir или exec выполняются на POSIX
- **THEN** прежние quoting, cwd, remote timeout и ограничение вывода сохраняются

### Requirement: Unsupported Windows adapters stay local
До реализации Windows-совместимых adapters расширение MUST оставлять стандартные read/write/edit/bash локальными для Windows endpoint и явно сообщать это при подключении и в status. Remote exec MUST оставаться доступным; Windows и SSH-конфигурация MUST не изменяться ради совместимости.

#### Scenario: Local tools after Windows connect
- **WHEN** подключён Windows endpoint
- **THEN** status указывает локальный routing стандартных инструментов и remote-команды запускаются только через remote exec

#### Scenario: Return to POSIX
- **WHEN** после Windows подключён POSIX endpoint
- **THEN** прежнее поведение POSIX routing восстанавливается согласно выбранному режиму
