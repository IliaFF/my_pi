# Spec Delta

## ADDED Requirements

### Requirement: Installer rollback has executable regression coverage
Mandatory gate MUST запускать настоящий installer rollback CLI во временном agent без production-данных. Тесты MUST проверять внутренние ссылки, восстановленное содержимое и executable bits, отказ опасных/нечитаемых archives до изменения agent и явную ошибку automatic rollback. Статические проверки текста MUST NOT заменять выполнение rollback.

#### Scenario: Regression на обычной npm-ссылке
- **WHEN** sandbox backup содержит `.bin/jiti -> ../jiti/lib/jiti-cli.mjs` и текущий managed файл отличается
- **THEN** тест вызывает настоящий CLI, проверяет нулевой exit, исходные bytes/target/mode и сохранность unmanaged sentinel

#### Scenario: Adversarial archive
- **WHEN** sandbox backup содержит traversal, внешнюю ссылку, опасную цепочку, unmanaged destination, специальный файл либо повреждённый/отсутствующий payload
- **THEN** тест проверяет ненулевой exit и неизменность текущих managed/unmanaged sentinels

#### Scenario: Ошибка automatic rollback
- **WHEN** sandbox installer fails и его rollback отклоняет backup
- **THEN** фактическое выполнение сообщает исходный сбой и отказ восстановления, не печатает успешный rollback и не обращается к личному runtime
