## REMOVED Requirements

### Requirement: New eager terminal survives legacy session reopening
**Reason**: Расширение pi-subagents выведено из сборки, eager-регистрации terminal больше не существует, а restore-ветка для её имени стала мёртвой.
**Migration**: Managed-список восстановления содержит только оставшиеся отложенные инструменты; записи истории и префикс не переписываются, отсутствующие имена игнорируются при восстановлении.
