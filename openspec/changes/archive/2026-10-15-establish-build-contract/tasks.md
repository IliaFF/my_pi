## 1. Источник и контракты

- [x] 1.1 Скопировать portable source, не переносить runtime/credentials; создать Git и OpenSpec для Pi.
- [x] 1.2 Написать proposal, design и проверяемые контракты.
- [x] 1.3 Закрепить workflow в инструкциях проекта и документации восстановления.

## 2. Проверки

- [x] 2.1 Добавить единую команду, изоляцию agent, deadlines и JSON/log artifacts.
- [x] 2.2 Подключить существующие unit и SDK integration, регрессию двух владельцев сжатия.
- [x] 2.3 Проверить rollback и отказ при повреждённом backup.
- [x] 2.4 Добавить RPC startup smoke без prompt/credentials и GitHub Actions.
- [x] 2.5 Запретить обновление без полного набора проверок; сохранять rollback при ошибке.

## 3. Подтверждение

- [x] 3.1 Проверить чистую установку dependencies и `npm test`, негативные сценарии.
- [x] 3.2 Записать результаты, ограничения и известный runtime drift; проверить отсутствие секретов.
- [x] 3.3 Проверить готовность change к archive/baseline commit по evidence.
