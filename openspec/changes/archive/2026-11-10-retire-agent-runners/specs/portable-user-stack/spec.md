## REMOVED Requirements

### Requirement: Single managed terminal specialist
**Reason**: pi-subagents и его terminal-роль выводятся из сборки; отдельного исполнителя-ребёнка не остаётся.
**Migration**: Управляемый профиль больше не регистрирует агентские пакеты и их настройки; остальные пакеты и их версии не меняются.

### Requirement: Terminal edits are non-production only
**Reason**: Правило ограничивало область правок retired исполнителя.
**Migration**: Действуют общие границы разрешений и согласований для неагентской работы.

### Requirement: Parent controls terminal edit scope
**Reason**: Относится к передаче правок дочернему агенту.
**Migration**: Не требуется; родитель работает напрямую в текущих правах.

### Requirement: Terminal standard tools remain instruction bounded
**Reason**: Описывает набор инструментов retired терминальной роли.
**Migration**: Инструменты берутся из действующего профиля без отдельного дочернего набора.

### Requirement: Terminal inspector dashboards are available in Herdr
**Reason**: Inspector-панель была частью pi-subagents/Herdr-агентов; оба раннера удаляются.
**Migration**: Стандартные панели и sidebar Herdr остаются функционалом Herdr и не настраиваются этой сборкой.

## MODIFIED Requirements

### Requirement: Approved inventory is reproducible
Сборка MUST предоставлять закреплённые Firstmate, Herdr backend, Treehouse, workspace-history, три пользовательских style-skill, патченный paper-search MCP и регистрацию AITunnel. Firstmate MUST оставаться отдельным checkout с project-scoped расширениями Pi, а не глобальной копией. Сборка MUST NOT предоставлять pi-subagents, pi-herdr-agents, terminal-роль, их конфиги, снимки и агентские процессы. Стандартный Herdr CLI/сервер и связанная запись `stack/lock.json` MUST оставаться без изменений.

#### Scenario: Fresh supported installation
- **WHEN** согласованная установка завершена на поддерживаемой платформе
- **THEN** согласованные компоненты присутствуют в заявленных версиях, а агентские раннеры и их конфиги отсутствуют
- **THEN** стандартный Herdr доступен без изменений и не требует агентского расширения

#### Scenario: Preservation of unrelated packages
- **WHEN** установка выполняется поверх личного профиля
- **THEN** неуправляемые пакеты, версии, авторизация и данные пользователя сохраняются, а retired записи агентских раннеров удаляются из управляемого профиля
