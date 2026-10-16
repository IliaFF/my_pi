# Spec Delta

## ADDED Requirements

### Requirement: Latest release acceptance preserves version coherence
При принятии latest release сборка MUST проверять согласованность версий глобального core, runtime SDK peers, exact lock и version-gated patches. При несовместимости установка MUST быть отклонена до production; после разрешённой установки MUST выполняться полный host gate.

#### Scenario: Isolated latest candidate
- **WHEN** подготовлен candidate с новыми stable версиями
- **THEN** реальные SDK integration, CLI startup и проверки патчей проходят на exact dependencies до изменения личного runtime

#### Scenario: Accepted deployment
- **WHEN** проверенный candidate установлен с сохранением личной конфигурации и recovery backup
- **THEN** полный host gate подтверждает версии и патчи, а пользователь получает путь backup и требование перезапуска

#### Scenario: Failed deployment validation
- **WHEN** post-install gate завершается ошибкой
- **THEN** новая установка не объявляется принятой, выполняется восстановление runtime и прежнего global core с повторным gate, а неуспешное восстановление сообщается явно
