## Why

Сборка меняется вне Git, а изолированные тесты пропустили конфликт двух владельцев сжатия. Нужны воспроизводимый источник, проверяемые контракты и сохранённые причины изменений, чтобы локализовать регрессии после обновлений.

## What Changes

- Перенести portable maintenance source в отдельный Git-каталог `pi-build`, не переносить runtime и секреты.
- Сверить exact versions расширений с установленным runtime; перенести RPIV patch с 2.12.0 на 2.13.8 после проверки stock поведения.
- Закрепить фактически активное ядро Pi `1.2.0` вместо устаревшего snapshot `1.0.0`; согласовать runtime peers и проверки актуальной policy. Не обновлять production.
- Ввести OpenSpec перед правками: proposal → specs → design → tasks → проверки → archive.
- Единой командой проверять unit, SDK integration, патчи, восстановление и RPC startup; использовать её же в CI.
- Сохранять результаты проверок и порядок воспроизведения/отката.
- Зафиксировать регрессию сжатия: один владелец summary, без обращения к модели.

## Capabilities

### New Capabilities

- `build-governance`: история изменений, граница источника и runtime, восстановление.
- `build-validation`: обязательный независимый от личного окружения набор проверок.
- `interaction-availability`: доступность UI-only tools с первого turn и после смены UI.
- `compaction-reliability`: детерминированное сжатие без конкурирующего модельного обработчика.

### Modified Capabilities

Нет: OpenSpec ранее отсутствовал.

## Impact

Исходники maintenance, install/update, тестовые entry points, GitHub Actions. Production установка не меняется автоматически. Внешние модели, Telegram, Chrome и SSH не проверяются реальными запросами в обязательном CI.
