# Spec Delta

## REMOVED Requirements

### Requirement: Workflow assistance has an offline real-SDK gate
**Reason**: Обязательные этапы `deepseek-workflow` и `deepseek-workflow-sdk` проверяли только удалённое расширение.
**Migration**: Остальные этапы gate без изменений; вместо них добавлена контрактная проверка того, что контур отсутствует в источнике, манифесте и установщике.
