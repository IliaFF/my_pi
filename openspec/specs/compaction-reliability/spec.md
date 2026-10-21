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

### Requirement: Autocompaction has no emergency packet dependency
The extension MUST NOT extract or write emergency recovery packets, carry their paths in follow-ups, or require a writable recovery directory. Existing user recovery files MUST remain untouched. Threshold, compactability, retention and continuation lifecycle MUST remain unchanged.

#### Scenario: Recovery location is unwritable
- **WHEN** context reaches the configured compactable threshold but the former recovery location cannot be created
- **THEN** compact starts normally and no packet filesystem operation or packet reference is produced

#### Scenario: Deterministic owner remains singular
- **WHEN** both extensions load in either order and Pi compacts
- **THEN** context-fold alone supplies the index, no model/auth call occurs, and manual compaction remains idle
