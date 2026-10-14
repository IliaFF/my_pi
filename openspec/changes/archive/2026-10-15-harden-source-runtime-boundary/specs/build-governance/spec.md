## MODIFIED Requirements

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
