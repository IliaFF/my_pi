## REMOVED Requirements

### Requirement: Approved installation is scoped and recoverable
**Reason**: pi-herdr-agents выводится из сборки, поэтому сценарий его scoped-внедрения с backup и rollback больше не существует.
**Migration**: Установка и откат остальных компонентов регулируются общими требованиями portable-user-stack; backup и проверка сохранения личного профиля сохраняются.

### Requirement: Retired Pi plugin is not reinstalled
**Reason**: Требование стало безусловным: агентские расширения Herdr не устанавливаются вовсе, вместе с routing-абзацем.
**Migration**: Запрет закреплён требованием об отключённом делегировании и проверкой gate на отсутствие агентских раннеров.
