# Spec Delta

## REMOVED Requirements

### Requirement: Workflow assistance is a managed source-owned extension
**Reason**: Контур откатан по требованию пользователя: A/B не показал пользы, а переписывание головного system-сообщения ломало prompt cache каждый ход.
**Migration**: Установщик больше не копирует расширение и не включает его в `managed`; исторические бэкапы, содержащие `extensions/jev-review`, остаются восстанавливаемыми через allowlist `uninstall.sh`.
