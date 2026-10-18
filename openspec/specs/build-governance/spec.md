# build-governance Specification

## Purpose
Сохранить причины и контракты изменений сборки, отделить portable источник от личного runtime и обеспечить проверяемое восстановление.

## Requirements

### Requirement: Изменения имеют проверяемую историю
Сборка MUST хранить portable исходники в Git. Изменения поведения MUST иметь OpenSpec change до редактирования кода, описание причины, сценарии проверки и результат проверки. Архивировать change MUST только после завершения обязательных проверок.

#### Scenario: Исправление регрессии
- **WHEN** воспроизведена поломка сборки
- **THEN** change связывает failing regression, исправление и passing проверку с Git revision

### Requirement: Источник не содержит личного runtime
Репозиторий MUST исключать credentials, пользовательские sessions, базы контекста, backups, runtime dependencies и личные логи. Исключение dependencies MUST действовать и для directory, и для symlink; новые runtime store paths MUST не попадать в commit.

#### Scenario: Подготовка baseline
- **WHEN** источник подготовлен для commit
- **THEN** проверка portable release отклоняет известные секреты и запрещённые runtime paths

#### Scenario: Dependencies подключены symlink
- **WHEN** зависимости подключены через node_modules symlink
- **THEN** Git исключает symlink так же, как каталог зависимостей

#### Scenario: Runtime folding store появился в source
- **WHEN** context-fold seed indices появились в корне source
- **THEN** Git исключает store, а release validation отклоняет такую упаковку

### Requirement: Восстановление проверяет целостность
Процедура восстановления MUST проверять целостность backup и допустимые назначения до записи, сохранять исходники отдельно от runtime и не объявлять успешным непроверенный откат.

#### Scenario: Повреждённый backup
- **WHEN** payload backup изменён после создания
- **THEN** восстановление отклонено и текущий управляемый файл не изменён

#### Scenario: Восстановление управляемого файла
- **WHEN** управляемый файл изменён после backup
- **THEN** проверенный backup восстанавливает исходное содержимое

### Requirement: Approved deployment can preserve personal configuration
Installer MUST provide an explicit configuration-preserving deployment mode. Existing personal settings, instructions and context policy MUST survive; only explicit npm pins for managed runtime dependencies MAY change to exact source versions. Credentials and sessions MUST NOT be overwritten. Missing personal files MUST receive portable defaults. Existing backup and rollback MUST cover changed managed files.

#### Scenario: Existing customized runtime
- **WHEN** explicitly approved locked deployment uses preservation mode with custom settings, package objects and instructions
- **THEN** provider/model/custom fields and package options stay unchanged, known pinned packages align to source, instructions and context policy remain byte-identical

#### Scenario: Fresh agent in preservation mode
- **WHEN** preservation mode is selected but personal configuration is absent
- **THEN** portable defaults are installed

#### Scenario: Published release diverges from local source
- **WHEN** an approved installation follows integration of published changes with local commits
- **THEN** local behavior and private configuration are preserved, exact merged source and host gates pass, and any active project override is backed up and validated separately before being reported as updated

### Requirement: Approved optional package removal is scoped
An explicitly requested optional package removal MUST update portable declarations, dependency lock and installed package configuration without removing other direct dependencies or private user data. Runtime removal MUST have a recoverable pre-state backup. Already loaded extension hooks MUST NOT be reported as unloaded until reload/restart.

#### Scenario: User requests four optional packages removed
- **WHEN** removal is approved for pi-my-setup, pi-gpt-fast-mode, pi-telegram and pi-diff-review plus local reader-pane.ts
- **THEN** they are absent from source declarations and installed packages, other direct versions and personal settings remain unchanged except selected package declarations, and offline gates pass

#### Scenario: Package owns saved user configuration
- **WHEN** optional package is removed
- **THEN** saved configuration and credentials are preserved, and reload/restart requirement is explained

#### Scenario: Reader pane removal and historical restore
- **WHEN** source is installed after reader-pane removal
- **THEN** reader source/test/copy step and RPC command are absent, existing deployed file is removed, and a verified pre-removal backup may still restore that exact retired extension path

### Requirement: Clear explanations preserve implementation discipline
The build MUST not declare or load Caveman after approved removal. Communication policy MUST request clear full-sentence explanations with direct answers, relevant mechanism/reasons/consequences, examples when useful and distinct verified facts/assumptions. Only operational progress notifications default to brief. Ponytail and safety/validation requirements MUST remain unchanged. Private instructions MUST be preserved outside the explicitly added communication block.

#### Scenario: Fresh offline session after removal
- **WHEN** the updated source/runtime starts without a user prompt
- **THEN** Caveman package and command are absent, Ponytail and queue remain available, and no model request is made

#### Scenario: Existing personal policy
- **WHEN** the new communication block is added
- **THEN** all existing private policy text outside that block remains byte-identical and backup is available

#### Scenario: Explanation quality
- **WHEN** static checks and offline startup pass
- **THEN** they are reported as loading/policy verification, not proof of improved live explanations or token savings

#### Scenario: Historical Caveman patch backup
- **WHEN** a verified pre-removal backup contains the retired pi-caveman/package.json and pi-caveman/extensions/caveman.ts payloads
- **THEN** rollback accepts those exact destinations without accepting arbitrary new paths
