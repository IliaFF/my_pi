## REMOVED Requirements

### Requirement: Delegation has a managed multi-window threshold
**Reason**: Делегирование отключено, порог одного управляемого контекста больше не маршрутизирует работу.
**Migration**: Работа выполняется напрямую неагентскими инструментами в текущем бюджете.

### Requirement: Delegation preserves execution boundaries
**Reason**: Относится к исполнителям-детям, которых в сборке больше нет.
**Migration**: Границы разрешений, handoff и запрет shell-пилота для агентов сохраняются в общих требованиях.

### Requirement: Candidate evidence distinguishes persistence from context continuity
**Reason**: Сравнение Herdr и Durable раннеров потеряло смысл после отказа от агентских раннеров.
**Migration**: Сохраняется в архиве changes как историческая запись.

### Requirement: Permanent policy preserves the advance delegation decision
**Reason**: Постоянная инструкция больше не выдаёт решения о заблаговременной делегации.
**Migration**: Standing prompt объявляет делегирование отключённым; анализ размера контекста для делегирования не требуется.

### Requirement: Permanent policy preserves delegation responsibility
**Reason**: Правила сохранения цели и ответственности родителя относились к executors-детям.
**Migration**: Ответственность родителя за планирование, проверку и приёмку остаётся в general-agent-policy.
