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

### Requirement: Index user intents exclude owned control envelopes
Both soft-fold and hard-compaction indexes MUST exclude the build's exact restore-control envelope from User intents and index the substantive task body of its exact queue envelope instead of the queue heading. Ordinary user text, recovery source contents and other index fields MUST remain unchanged. The context-fold patch MUST be versioned and exercised in the mandatory gate without model or credential calls.

#### Scenario: Restore and queued task
- **WHEN** history contains a normal user request, the owned restore prompt and the owned queue prompt
- **THEN** the two index extractors preserve the request and task-body first line, not the restore line or queue heading

#### Scenario: Similar ordinary text
- **WHEN** a user discusses restoration or quotes a queue heading without the full owned envelope
- **THEN** the ordinary first-line intent remains indexed

#### Scenario: Multiline limitation remains explicit
- **WHEN** a request has its restriction on a later line
- **THEN** a characterization test documents first-line truncation; the build MUST NOT claim that this change preserves the later restriction in User intents

### Requirement: Canary-free model-safe 500k compaction
The build MUST cap extension-triggered compaction at 500000 tokens and retain native reserve protection for smaller models. Canary MUST NOT be installed, activated, patched or managed by the build, and no Canary recall probes MUST be sent. context-fold MUST remain the sole summary owner. Manual user compaction MUST remain non-continuing. The mandatory gate MUST reject Canary release artifacts and exercise native smaller-window compaction through the real SDK.

#### Scenario: Large context window
- **WHEN** compactable context grows past 170000 but remains below 500000 in a sufficiently large model
- **THEN** the local threshold does not compact and it does compact at 500000

#### Scenario: Smaller model
- **WHEN** native projected context exceeds model contextWindow minus reserveTokens below 500000
- **THEN** native compaction still runs rather than waiting for an impossible threshold

#### Scenario: Canary-free release
- **WHEN** the release is validated and installed into an isolated fixture
- **THEN** Canary is absent from dependencies, lock, settings, patches and managed configs, and a normal SDK prompt receives a direct response without a recall probe

#### Scenario: Test artifact isolation
- **WHEN** the SDK regression compacts its synthetic sessions
- **THEN** all session and context-fold artifacts remain in its temporary fixture, and the source release scan remains strict
