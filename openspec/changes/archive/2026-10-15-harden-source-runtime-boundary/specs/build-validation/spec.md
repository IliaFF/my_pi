## MODIFIED Requirements

### Requirement: Проверки изолированы и ограничены
Обязательные тесты MUST использовать временный agent без личного auth/runtime. Проверки модели MUST использовать fake provider или запрет вызова; smoke MUST не отправлять prompt. Каждый subprocess MUST иметь deadline. Standalone integration MUST не создавать runtime stores вне sandbox даже при заданном PI_CODING_AGENT_DIR.

#### Scenario: Тест на чистом окружении
- **WHEN** проверка запущена без пользовательского HOME и credentials
- **THEN** тесты используют закреплённые dependencies и временные файлы

#### Scenario: Зависший этап
- **WHEN** этап превышает deadline
- **THEN** команда завершается с ошибкой, а результат помечает timeout

#### Scenario: Standalone compaction с внешним agent directory
- **WHEN** тест запускается с PI_CODING_AGENT_DIR вне sandbox
- **THEN** compaction ledger создаётся только внутри sandbox, а исходная переменная восстанавливается после теста
