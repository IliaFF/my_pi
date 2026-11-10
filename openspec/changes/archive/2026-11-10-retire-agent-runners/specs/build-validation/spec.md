## REMOVED Requirements

### Requirement: Terminal delegation has offline SDK acceptance
**Reason**: Отдельного адаптера агентского раннера в сборке больше нет, проверять нечего.
**Migration**: Вместо retired SDK-проверок обязательный gate содержит проверку отсутствия агентских раннеров и ссылок на них.

### Requirement: Terminal inspector policy has native SDK coverage
**Reason**: Inspector-панель относилась к retired Herdr-агентам.
**Migration**: Стандартные панели Herdr остаются вне этой сборки и не покрываются её gate.

## ADDED Requirements

### Requirement: Retired agent runners stay out of the build
Обязательный gate MUST проверять, что source-профиль, манифест, npm-манифест и lock, install/uninstall-скрипты и постоянные инструкции не содержат агентских раннеров (pi-subagents, pi-herdr-agents, terminal-роль, их конфиги и снимки) и что постоянная политика объявляет делегирование отключённым. Проверка MUST исполняться офлайн, без credentials, провайдеров и запуска агентских процессов, и MUST NOT подменять реальные SDK-проверки остальных компонентов.

#### Scenario: Source drift
- **WHEN** агентский раннер или его конфиг повторно появляется в управляемом наборе
- **THEN** обязательный gate падает с указанием конкретного файла и записи

#### Scenario: Policy drift
- **WHEN** постоянные инструкции снова требуют передавать работу дочернему исполнителю
- **THEN** обязательный gate падает и указывает на отсутствующее или противоречащее правило

#### Scenario: Retired adapters
- **WHEN** npm test выполняется после удаления раннеров
- **THEN** retired адаптеры не запускаются, а остальные unit, SDK и startup-проверки сохраняют реальные exit-коды
