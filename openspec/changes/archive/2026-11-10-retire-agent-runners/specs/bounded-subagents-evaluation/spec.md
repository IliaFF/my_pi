## REMOVED Requirements

### Requirement: Isolated pinned evaluation
**Reason**: Оценка кандидата pi-subagents завершена отказом оператора от агентских раннеров.
**Migration**: Остаётся исторической записью в архиве changes; новая оценка раннеров не требуется.

### Requirement: Bounded live admission
**Reason**: Допуск live-запусков дочерних агентов больше не является частью политики сборки.
**Migration**: Агентские процессы отключены; live-проверки моделей выполняются только по отдельному согласованию без агентов.

### Requirement: Evidence-driven adoption
**Reason**: Внедрение раннера отклонено, поэтому правила доказательного внедрения компонента не нужны.
**Migration**: Не требуется.
