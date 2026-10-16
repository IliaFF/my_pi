# Design

## Context

См. proposal.md. Source и активный core: 1.2.0; registry core latest: 1.3.0. `npm/package.json` содержит 19 direct dependencies. Семь файлов в `patches/` привязаны к версиям; `manifest.json` и maintenance проверяют exact version. `update-safe.sh` обновляет только extensions, восстанавливает managed configs и откатывает npm tree при ошибке; для обновления core используется installer.

## Goals / Non-Goals

**Goals:** воспроизводимый latest candidate, проверка фактических SDK контрактов, сохранение личного runtime с проверяемым откатом.

**Non-Goals:** новые расширения, рефакторинг updater, смена авторизации, paid/live probes, автоматический push или изменение постороннего TODO.

## Decisions

- Получить stable latest каждого существующего direct package из npm registry и зафиксировать таблицу до изменений. Core/pi-tui и host SDK peers согласовать. Не заменять exact lock плавающими версиями.
- Использовать существующие integration и patch проверки. При выявленной несовместимости сначала сохранить failing regression, затем минимально исправить shared code и callers. Не заменять SDK mock callback или строковыми asserts.
- Готовить candidate в isolated agent; переносить патчи только после чтения upstream diff затронутых файлов. Не применять старый patch к неизвестной версии принудительно.
- Обновить согласованные version references в manifest, lock, installer, tests, README, rollback docs и OpenSpec config. Иные specs читать до изменения соответствующего поведения.
- Для deployment переиспользовать `install.sh --preserve-settings --install-core`, а не прямой `pi update`: installer устанавливает проверенный lock. Отдельно сохранить global core, поскольку npm-tree backup его не покрывает.

## Risks / Trade-offs

- [API drift 1.3.0] → isolated full gate с настоящим SDK, перенос только необходимых callers.
- [Изменение upstream patched packages] → version-gated patches, fresh replay и regressions; при FAIL не устанавливать.
- [Потеря private config] → backup до записи, byte/hash сравнение вне разрешённых version pins, auth и sessions не менять.
- [Global core вне runtime backup] → отдельно сохранить старый global package tree и проверить путь восстановления до установки.
- [Текущая сессия держит старый код] → после принятия обязателен restart, не обещать hot reload.

## Migration Plan

1. Зафиксировать начальный Git/runtime state и registry версии; сохранить постороннюю правку TODO.md.
2. Подготовить exact candidate и необходимый перенос патчей; выполнить `npm test`, isolated install, registry patch replay и полный diff review.
3. Сохранить backup global core и runtime, выполнить согласованный preserve-settings install.
4. Выполнить `npm test -- --agent ~/.pi/agent` и maintenance verify; зафиксировать config preservation и фактические версии.
5. При post-install FAIL восстановить оба backup и повторить host gate. При неуспешном восстановлении остановиться с явным blocker.
6. Записать evidence и ограничения в change; архивировать только после PASS и завершения всех tasks. CI и внешние сервисы остаются непроверенными без отдельных запусков.
