# build-validation Specification

## Purpose
Обнаруживать несовместимость сборки после правок и обновлений одной проверяемой командой, без зависимости от личных credentials или сохранённых сессий.

## Requirements

### Requirement: Единый обязательный набор
Сборка MUST предоставлять одну команду проверки для локального запуска и CI. Она MUST включать unit, интеграцию настоящего Pi SDK, проверку патчей и startup smoke, а также отклонять некорректные OpenSpec документы.

#### Scenario: Несовместимое обновление
- **WHEN** dependency version или API несовместим с контрактом сборки
- **THEN** обязательная проверка завершается ненулевым кодом и сообщает упавший этап

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

### Requirement: Результаты доступны после ошибки
Набор MUST сохранять JSON со статусом каждого выполненного этапа, версиями и exit code, а также отдельные логи. CI MUST загружать эти результаты даже при ошибке.

#### Scenario: Упавшая регрессия
- **WHEN** тест завершается с ошибкой
- **THEN** JSON и лог указывают этап и причину отказа

### Requirement: Обновление имеет обязательный gate
Обновление MUST запускать тот же полный набор до принятия новой установки. При ошибке после изменения dependencies MUST запускаться восстановление backup; провал восстановления MUST быть явно сообщён.

#### Scenario: Регрессия после обновления
- **WHEN** статическая проверка проходит, но интеграция падает
- **THEN** обновление отклонено и запущен rollback

### Requirement: Portable maintenance archive can run isolated gate
Mandatory gate MUST run from a deployed source archive without Git metadata. Git-ignore verification MUST use a temporary repository carrying the source ignore rules, without initializing or modifying the installed directory.

#### Scenario: Deployed maintenance source has no Git directory
- **WHEN** the gate runs from an installed archive with locked tooling and runtime dependencies
- **THEN** ignore-rule regression runs in a temporary repository and does not fail because the archive has no .git

### Requirement: Meantime observation remains passive
The build MUST load Meantime from the existing pine-of-glass package alongside its selected extensions, without adding dependencies or enabling unrelated extensions. Offline checks MUST verify its command and UI timer lifecycle without a provider request. Activation MUST preserve private settings outside the approved allowlist addition and use a recoverable backup.

#### Scenario: Fresh offline startup
- **WHEN** updated portable or personal configuration starts Pi with no user prompt
- **THEN** /pace is registered, existing commands remain and no provider run starts

#### Scenario: UI reload and shutdown
- **WHEN** the actual Meantime extension receives UI startup, reload and shutdown in an isolated lifecycle probe
- **THEN** the old timer is cleared on reload and the final timer/widget cleared on shutdown

#### Scenario: Observability limits
- **WHEN** headless and fake-UI checks pass
- **THEN** results are not described as real interactive rendering validation or proof of correct provider latency attribution

#### Scenario: Explicit feature gate and preserved user config
- **WHEN** fresh configuration is installed
- **THEN** pi-meantime.json enables the observer, while preservation-mode reinstall leaves existing user tuning unchanged

### Requirement: Process-only background pilot has real offline lifecycle checks
The mandatory gate MUST exercise actual current Pi SDK and package shell lifecycle in a temporary workspace with no credentials or external provider calls, bounded test subprocess deadlines and cleanup of child trees. It MUST retain all existing SDK and CLI gates.

#### Scenario: Full offline regression
- **WHEN** process-only package pin/patch changes
- **THEN** success/error/timeout/cancel/log-limit/reload/shutdown checks and unsafe-request rejection run before runtime acceptance

### Requirement: Ponytail context changes have real SDK coverage
The mandatory gate MUST verify Ponytail request-local discovery and explicit commands using actual Pi SDK and faux provider contexts in an isolated agent with no credentials or external requests.

#### Scenario: Offline mode and command regression
- **WHEN** the full gate runs
- **THEN** active modes, off restoration, standalone discovery, independent review and explicit base/review/audit commands are checked against real provider context and errors fail the gate

### Requirement: Queue selection and general policy are regression checked
The mandatory offline gate MUST exercise explicit selection, FIFO, rejection and native tool errors with actual SDK tool execution, and assert the general APPEND preserves task-conditional recovery/communication/safety requirements.

#### Scenario: Offline regression
- **WHEN** the gate runs
- **THEN** real queue SDK errors/state changes and policy contracts are checked without credentials, paid requests or production task mutation

### Requirement: Native deferred tools have actual-package SDK regression
The mandatory gate MUST load the actual patched remote, preview and context packages with current Pi SDK in an isolated temporary agent, exercise safe discovery/execution and recorded-session restoration, and inspect native Codex payloads before any transport. No production sessions, credentials, SSH connections, renderer or live model are used.

#### Scenario: Full offline gate
- **WHEN** exposure patches or startup defaults change
- **THEN** eager-registration regressions, loss of callable tools, broken native discovery, altered resumed declarations or changed additive prefix fail the gate and leave a bounded log

### Requirement: Post-update acceptance matches the aligned baseline
The restored baseline MUST pin core and pi-tui 1.3.0 and the five extensions already upgraded by the approved stock update. Acceptance MUST include the full source gate and host gate, backed-up configuration-preserving scoped deployment and a separate actual-SDK check of any active project Ponytail override. Stock npm update alone MUST NOT be described as preserving local patches.

#### Scenario: Repair after stock update
- **WHEN** source and personal/project runtime patches are restored
- **THEN** full gates pass against the aligned lock, private settings/auth/instructions are preserved and restart/live-test limits are reported

### Requirement: Release validation follows exact candidate pins
Release validation MUST verify a stable core pin consistent with installer, runtime SDK and TUI pins instead of requiring a historical release number. Published-package replay MUST use the candidate's exact extension version while preserving existing behavioral assertions and lock consistency checks.

#### Scenario: Newer consistent core release
- **WHEN** manifest, installer, SDK, TUI and lock agree on a newer stable release
- **THEN** historical version literals alone do not reject it

#### Scenario: Mismatched installer or nonstable core
- **WHEN** installer differs from manifest or core is not stable semver
- **THEN** release validation fails before accepting the release

### Requirement: Updater safety fixtures follow the baseline version
The mandatory offline updater tests MUST derive a newer stable target from each fixture baseline and cover updated/future pins. They MUST preserve exact-settings acceptance and rollback rejection, preparation before repair, and rejection of incomplete OpenSpec before gate/publication. Real pins, acceptance policy and resource limits MUST remain unchanged.

#### Scenario: Managed browser pin already equals the historical target
- **WHEN** the baseline browser dependency and settings are0.1.28
- **THEN** both updater fixtures exercise a strictly newer target and all existing acceptance/rejection assertions remain meaningful

#### Scenario: A future baseline is used
- **WHEN** a synthetic newer baseline pin is used
- **THEN** the same fixtures pass without source version-literal edits and incomplete repair still never reaches gate or publication
