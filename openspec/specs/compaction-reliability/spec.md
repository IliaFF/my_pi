# compaction-reliability Specification

## Purpose
Предотвратить повторное зависание детерминированного сжатия из-за второго обработчика, который продолжает ожидать модель после построения summary.

## Requirements

### Requirement: Детерминированное сжатие не вызывает модель
При успешном deterministic сжатии сборка MUST иметь ровно одного владельца compaction summary и не вызывать модель или её authentication для генерации summary.

#### Scenario: Оба порядка загрузки
- **WHEN** auto compaction и context folding загружены в любом порядке
- **THEN** настоящий Pi compact сохраняет deterministic summary и завершает isCompacting без model/auth calls

### Requirement: Ручное сжатие не продолжает работу
Ручное сжатие MUST не запускать модельное продолжение; автоматическое продолжение MUST сбрасываться при ошибке и смене сессии.

#### Scenario: Ручной compact
- **WHEN** пользователь вручную сжимает контекст
- **THEN** follow-up не отправляется

#### Scenario: Ошибка сжатия
- **WHEN** запущенное автосжатие отменено или завершается ошибкой
- **THEN** in-flight флаг сбрасывается и следующая допустимая попытка не заблокирована
