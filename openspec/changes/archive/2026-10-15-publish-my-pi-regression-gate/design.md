## Context

origin/main=55bfb81, локальный standalone baseline=b7255a8 без общего ancestry. SSH authentication GitHub подтверждена для IliaFF. Public Actions API доступен, исходно jobs=0.

## Decisions

Создать build/openspec-regression-gate от origin/main; перенести только tracked portable baseline, сохранить remote TODO и 3 Jev files, удалить superseded patch. Не merge unrelated histories и не force-push. Пользователь затем переопределил выбор: push сразу в main. Публиковать local branch в origin/main обычным fast-forward после проверки remote head. Root pi-build после переноса переключить на обновлённую main, чтобы следующие изменения имели корректную историю my_pi.

## Risks / Trade-offs

Первый CI может обнаружить различия GitHub runner и локального Linux; тогда сохранить failing job и исправлять отдельным OpenSpec change. Hosted CI не доказывает live API/Telegram/Chrome/SSH. Archive publication change после passing CI требует отдельного commit/push, проверить и итоговый job.
