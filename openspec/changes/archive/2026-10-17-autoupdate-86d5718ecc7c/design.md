## Context

Контроллер утвердил 19 exact direct versions. Некоторые обновляемые пакеты несут локальные патчи; stock update не гарантирует их сохранение. Источник предоставлен без .git.

## Goals / Non-Goals

Сохранить все существующие assertions и SDK behavior, package names, scripts, allowScripts и managed configs. Не добавлять features, не обращаться к paid API и не устанавливать production runtime.

## Decisions

Использовать npm lock-only resolution с --ignore-scripts --legacy-peer-deps, затем npm ci с теми же флагами. До адаптации патчей запустить неизменённый gate как regression probe. Переносить только требуемые локальные hunks; upstream implementation изучать перед изменением. Если нужен protected edit, остановиться. Проверить pristine npm replay отдельно от offline gate. Архивировать только после полного PASS; spec delta хранить в архиве без изменения существующего spec.

## Risks / Trade-offs

Upstream может изменить интерфейсы; существующие реальные SDK тесты остаются gate. npm audit findings документируются, но автоматические audit fix и lifecycle scripts запрещены. CI и реальные Chrome/SSH/provider проверки не подтверждаются offline gate.

## Migration Plan

Обновление только portable source. Контроллер выполняет review/commit/acceptance; deploy и rollback production не выполняются.
