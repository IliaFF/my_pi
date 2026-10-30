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
The mandatory gate MUST use actual current Pi SDK/package shell lifecycle in a temporary workspace, without credentials/external provider calls, with bounded deadlines and child-tree cleanup. Existing SDK/CLI gates MUST remain. Default and explicit wake MUST use actual SDK/scripted faux provider (not only callback/static mocks), covering idle/busy, defaults, duplicates, tool/EventBus admission, success/failure/cancel and native reload/shutdown.

#### Scenario: Full offline regression
- **WHEN** process-only package pin/patch changes
- **THEN** success/error/timeout/cancel/log-limit/reload/shutdown and default completion continuation (including timeout and /bg), explicit opt-out and explicit wake checks plus unsafe-request rejection run before runtime acceptance

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
The approved stable baseline MUST pin core and pi-tui 1.4.0 and align the managed extensions with the exact candidate lock. Acceptance MUST include the full source gate and each approved host gate, backed-up configuration-preserving scoped deployment and a separate actual-SDK check of any active project Ponytail override. Stock npm update alone MUST NOT be described as preserving local patches.

#### Scenario: Repair after stock update
- **WHEN** source and each approved runtime retain their version-gated patches
- **THEN** full gates pass against the aligned lock, private settings/auth/instructions and unrelated dependencies are preserved, actual CLI versions match and restart/live-test limits are reported

### Requirement: Release validation follows exact candidate pins
Release validation MUST verify a stable core pin consistent with installer, runtime SDK and TUI pins instead of requiring a historical release number. Published-package replay MUST use the candidate's exact extension version while preserving existing behavioral assertions and lock consistency checks.

#### Scenario: Newer consistent core release
- **WHEN** manifest, installer, SDK, TUI and lock agree on a newer stable release
- **THEN** historical version literals alone do not reject it

#### Scenario: Mismatched installer or nonstable core
- **WHEN** installer differs from manifest or core is not stable semver
- **THEN** release validation fails before accepting the release

### Requirement: Queue panel has native offline lifecycle coverage
The mandatory gate MUST exercise the queue widget through actual Pi SDK registration with faux/no provider, temporary TODO files and real TUI width handling, while preserving existing queue SDK coverage. Checks MUST cover collapsed/expanded output, external atomic edits, non-TUI isolation, reload/shutdown cleanup and read-only/no-model behavior.

#### Scenario: Mandatory offline gate
- **WHEN** npm test runs
- **THEN** native queue tool tests and panel rendering/lifecycle checks execute without credentials, external model calls or production TODO changes

#### Scenario: Installed archive startup
- **WHEN** the gate stages the managed files and starts the installed RPC CLI without a prompt
- **THEN** the queue module and all its imported helpers are present and load without a provider call

### Requirement: Queue presentation and native interactions are regression checked
Mandatory offline checks MUST retain all queue storage/error/lifecycle checks and exercise tree closure, themed statuses, precise overflow, narrow Unicode widths, tiny/tall viewport budgets, native shortcut invocation and render-time global expansion without changing TODO bytes or model messages.

#### Scenario: Queue polish gate
- **WHEN** npm test executes
- **THEN** pure formatting and actual SDK widget/shortcut cases run with temporary TODO and faux/no provider, without production file mutation

### Requirement: Queue check freshness has offline native coverage
The mandatory gate MUST cover changed/added/deleted and untracked files, stable service TODO changes, failed/unknown/running results and actual nested SDK background execution in temporary projects. No credentials, paid requests or production files may be used. Recorded-check completion MUST be tested with real native follow-up and a scripted faux provider, including success, failure and timeout without duplicate wake.

#### Scenario: Full gate
- **WHEN** npm test executes
- **THEN** snapshot regressions and actual queue/background package integration run with finite deadlines, stale checks cannot mutate TODO, and native completion continuation is verified offline

### Requirement: Snapshot resource fixtures fit the trusted VPS sandbox
The mandatory gate MUST exercise real queue fingerprint aggregate-byte rejection without requiring any individual fixture file larger than the existing 64 MiB VPS file limit. An offline subprocess regression MUST enforce that same per-file limit. Production fingerprint budgets, sandbox limits, deadlines and assertions MUST NOT be weakened to obtain a passing result.

#### Scenario: Oversized aggregate under per-file limit
- **WHEN** the real queue fixture runs with RLIMIT_FSIZE=64 MiB
- **THEN** multiple bounded sparse files exceed the unchanged 256 MiB aggregate budget and the fingerprint rejects them with its byte-limit error instead of setup failing with EFBIG

### Requirement: Updater safety fixtures follow the baseline version
The mandatory offline updater tests MUST derive a newer stable target from each fixture baseline and cover updated/future pins. They MUST preserve exact-settings acceptance and rollback rejection, preparation before repair, and rejection of incomplete OpenSpec before gate/publication. Real pins, acceptance policy and resource limits MUST remain unchanged.

#### Scenario: Managed browser pin already equals the historical target
- **WHEN** the baseline browser dependency and settings are0.1.28
- **THEN** both updater fixtures exercise a strictly newer target and all existing acceptance/rejection assertions remain meaningful

#### Scenario: A future baseline is used
- **WHEN** a synthetic newer baseline pin is used
- **THEN** the same fixtures pass without source version-literal edits and incomplete repair still never reaches gate or publication

### Requirement: Native quota fallback has offline SDK coverage
The mandatory gate MUST exercise the actual patched usage extension with actual Pi SDK lifecycle and footer rendering, isolated synthetic credentials and mocked HTTP. It MUST cover native/legacy disjoint IDs, missing/changed auth, rejected origins/redirects, account-source labels and late-result cleanup. No real model/provider calls are permitted.

#### Scenario: Mandatory quota regression
- **WHEN** npm test runs
- **THEN** fallback routing/rendering and credential rejection failures reject the build without private credentials or live requests

### Requirement: Task session handoff has offline native coverage
The mandatory gate MUST exercise actual native SDK command-backed replacement with a faux provider in temporary sessions. Coverage MUST include clean new context, automatic execution, cancellation, rejection boundaries and queue assessment before claim. No credentials, live models or production sessions may be used.

#### Scenario: Native integration gate
- **WHEN** npm test runs
- **THEN** goal-continuity policy wiring, real session handoff and queue dispatch boundaries are checked with finite deadlines; semantic model quality is not claimed

### Requirement: Queue recovery has mandatory offline native coverage
The mandatory gate MUST exercise preflight failure before background launch, explicit replacement across scopes, obsolete endpoint avoidance, launched-failure rejection and Blocked recovery through actual Pi SDK/background execution with a faux provider in temporary workspaces. Reopen without a fresh check and unsafe reopens MUST fail without mutating TODO. Old records MUST remain; no production TODO, settings, credentials or provider calls may be used.

#### Scenario: Mandatory recovery gate
- **WHEN** npm test runs
- **THEN** pure state/freshness assertions and actual native queue recovery scenarios run with finite deadlines alongside existing tests

### Requirement: Stable-update probes follow actual upstream lifecycle and payload contracts
The mandatory gate MUST exercise Meantime using the sandbox agent directory selected by the actual SDK. Native deferred-tool probes on core 1.4.0 MUST inspect the leading additional_tools declaration and transcript changes/additions/none modes rather than removed internal API fields. Tests MUST retain exact prefix, schema membership, fallback, removal/resume and zero-network assertions.

#### Scenario: Core and Meantime upstream contract updates
- **WHEN** the stable candidate uses SDK getAgentDir and in-history initial tool declarations
- **THEN** the same lifecycle and tool-preservation regressions run against actual packages without relying on obsolete HOME-only or anchorsAdditions assumptions

### Requirement: Session recovery fallback has offline SDK coverage
The mandatory gate MUST assert effective permanent recovery instructions with actual SDK assembly and characterize raw active-branch history access after real deterministic compaction using temporary synthetic sessions. It MUST demonstrate that a second-line user constraint can be absent from summary/recall yet remain recoverable from the exact native ledger before and after reopen, without personal sessions, model/auth calls or whole-transcript output.

#### Scenario: Raw user restriction survives hard compaction
- **WHEN** the real SDK compacts the temporary conversation
- **THEN** focused raw-history recovery returns the exact restriction from the current branch before and after reopening, while effective-policy checks retain TODO authority and bounded sensitive retrieval

### Requirement: Fresh install preflight does not require its future runtime
Installer source preflight MUST retain structural, privacy, pin and registry patch validation without requiring an already installed Pi/context-fold SDK. Runtime-independent harness checks MUST still run. The mandatory npm test gate MUST force full installed-runtime SDK validation, regardless of the internal installer preflight mode.

#### Scenario: Empty profile and no usable Pi
- **WHEN** a fresh candidate is validated before dependencies/core are installed
- **THEN** source validation can succeed without importing a nonexistent runtime; the installer still requires its documented install-core permission to install a missing core

#### Scenario: Mandatory source gate
- **WHEN** npm test runs
- **THEN** it explicitly disables the source-only preflight mode and retains the actual SDK check

### Requirement: Release scanning prunes excluded runtime directories
The release privacy scan MUST skip descent into .git, node_modules and test-results, not traverse them before filtering. All other release files MUST retain the existing forbidden-path and secret-content validation, including similarly named non-excluded directories.

#### Scenario: Dependencies exist in the source tree
- **WHEN** source validation runs with installed test dependencies
- **THEN** excluded directory descendants are not visited, ordinary files remain checked, and no dependency relocation is needed

### Requirement: Portable stack has isolated acceptance checks
Mandatory checks MUST cover fresh/preserved instructions, the approved package/skill/MCP/provider inventory, pinned Firstmate bootstrap and refusal of unsafe replacement. Actual SDK assembly MUST verify the Firstmate fallback with project APPEND precedence. Live transports, fleet execution and provider quality MUST remain separately unverified.

#### Scenario: Full source gate
- **WHEN** npm test runs
- **THEN** stack contracts and isolated installer/SDK cases execute alongside all retained integration/startup checks without production files, credentials or external model calls
