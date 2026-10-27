# Design

## Context

См. proposal.md — Why. uninstall.sh проверяет принадлежность state.json выбранному agent и известный managed allowlist, затем ошибочно отклоняет любой `..` в symlink target. В install.sh error trap использует другой, необработанный `tar -xzf`. Оба пути могут удалять managed файлы до обнаружения проблем с payload; missing archive сейчас не всегда считается ошибкой.

Реальный отказ: относительный target `../jiti/lib/jiti-cli.mjs` из npm/node_modules/@earendil-works/pi-coding-agent/node_modules/.bin/jiti остаётся внутри npm. Отказ произошёл до удаления текущего runtime. Installer backup сохранён локально; его данные и список личных версий не копировать в Git.

## Goals / Non-Goals

**Goals:** восстановить валидный installer backup с обычными npm-ссылками; проверить payload и назначения до разрушительных действий; единый manual/automatic путь, настоящий regression и проверяемое восстановление текущего runtime.

**Non-Goals:** новый updater, новый формат maintenance backup, новые зависимости, массовое выравнивание npm pins, Canary/500k/prewarming, перенос личного runtime в source. Полную атомарность замены нескольких директорий при disk-full не обещаем.

## Decisions

1. Оставить uninstall.sh каноническим restore installer backup и вызывать его из error trap install.sh. Не вводить общий framework или дублирующий restore-helper. Сохранить явную обработку global-core rollback в installer и ненулевой статус при любом отказе.
2. Не заменять запрет `..` простым lexical normalize: цепочки ссылок могут изменить фактическое назначение. Сначала распаковать полный payload в приватный temporary staging стандартным `tarfile` с явным `filter="data"` (эта возможность уже используется в scripts/test-release.py). Проверить member names/types, принадлежность managed путям, link targets с учётом staging и цепочек, а также реальные destination parents в agent. Внешние/абсолютные links, unmanaged targets и unsafe special files отклонять до удаления текущих файлов.
3. Не считать отсутствие agent-files.tar.gz допустимым пустым restore. Удаление managed файлов разрешается только после успешной полной подготовки staging. Использовать стандартное копирование с сохранением ссылок и необходимых modes; проверить восстановленные bytes/link targets/executable bits перед PASS. На ошибке сообщить, что restore не подтверждён, оставить исходный backup для повторной попытки.
4. Тестировать реальный shell CLI в TemporaryDirectory, используя созданные самим тестом state/archive и sentinels, а не извлечённый fragment Python. Первым оставить failing regression прежнего отказа. Дополнить existing harness ровно одним rollback stage; SDK/прочие gates сохраняются. Прогнать installer error trap в sandbox с контролируемым сбоем без npm network/личного agent.
5. Не ослаблять проверки backup ownership, state allowlist и managed boundaries. Legacy installer state не содержит криптографической подписи/контрольных сумм всех файлов: безопасная распаковка не доказывает происхождение archive. Не заявлять, что новый фильтр заменяет существующую hash-валидацию отдельного maintenance backup формата.

## Risks / Trade-offs

- [Дополнительное место для полного staging] → проверка/распаковка до удаления runtime; при нехватке места безопасный ненулевой exit, исходные файлы не трогать.
- [Цепочки symlink/hardlink и pre-existing symlink parents] → стандартный extraction filter плюс post-extraction confinement; adversarial tests с внешним sentinel, включая unmanaged paths внутри agent.
- [Ошибка копирования после начала замены] → не объявлять PASS; сохранять исходный backup и явно сообщать частично выполненный/неподтверждённый restore. Полная transactional замена всех managed paths вне scope.
- [Личный runtime новее source lock] → не повторять полный installer после восстановления; отдельно применить только tested pi-ssh-remote 0.1.15 delta с backup. До записи доказать соответствие старого remote baseline; обновлять только относящиеся к remote maintenance metadata, не весь manifest/dependency lock.
- [Runtime SDK отличается от source SDK] → gate source и actual installed SDK/remote check выполнить раздельно. При несоответствии baseline не патчить вслепую и не объявлять full runtime drift PASS.

## Migration Plan

1. Failing sandbox regression на текущем uninstall.sh, затем source fix и security cases.
2. Mandatory npm test, strict OpenSpec validation, полный owned diff и source/spec/tests commit; archive только после PASS всех tasks и отдельного запроса.
3. После source PASS — восстановить согласованный backup реального agent, проверить pre-install hashes/pins и результат отката. При отказе остановиться, не переходить к другим задачам.
4. Установить только SSH delta с отдельным backup; проверить actual installed SDK/remote, identity и сохранность остальных npm pins/личных настроек. Credentials не копировать/не выводить. Activation current process требует reload/restart.
5. Завершить текущую TODO-задачу установки; только затем открыть отдельную native session для следующей независимой TODO-задачи Canary/500k/prewarming.
