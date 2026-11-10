# Design

## Scope and initial state
Source HEAD 713b859, tracked diff пуст. Существующий untracked archive enable-terminal-herdr-inspector не принадлежит задаче и сохраняется. Корневой TODO fresh_pi — владелец статуса.

## Decisions
1. Один Node helper выполняет read-only preflight до backup/npm и повторную проверку перед миграцией после backup. APPEND symlinks, linked ancestors и неизвестные изменения target-файлов отклоняются. Внешний агентский каталог не используется в проверках.
2. Исторические SHA-256 поставлявшихся retired файлов и точные удаляемые блоки APPEND хранятся как данные, не как исполняемый legacy. Runtime не читает Git. Тесты закрепляют historical fixtures в source; неизвестные варианты требуют ручного разбора.
3. Backup включает точные runner files и проверенный extensions/jev-review. Каталоги runner не удаляются рекурсивно: личные соседние файлы остаются. Jev directory удаляется только после проверки каждого обычного файла; symlinks/special/unknown files запрещены.
4. APPEND меняется только удалением целых точно известных legacy sections, с сохранением остального текста и CRLF. Изменённый legacy section вызывает отказ до изменений. Это согласованное исключение из byte-identical preservation; произвольный личный APPEND сохраняется.
5. Новая restore allowlist принимает точный новый набор плюс прежние наборы. Backup/restore покрывают изменения APPEND/settings/retired files; gate исполняет настоящий uninstall.
6. APPEND — source-only template с snapshotRuntime:false; restore:false остаётся. Системный абзац о запрете делегирования не возвращается, остаточное требование удаляется через OpenSpec.
7. Default readseek/thresholds/cooldownMs и retired settings.subagents убираются; остальные личные settings не очищаются.

## Spec synchronization
Main specs синхронизируются с reviewed deltas до gate, чтобы regression проверяла уже выбранный source contract. После PASS archive использует --skip-specs только для предотвращения повторного применения этих же deltas; strict validation не отключается, затем полный gate повторяется на архивированном scope.

## Verification and limits
Сначала RED для реальных installer blocks, внешней symlink-цели, полного migration/rollback и snapshot настоящей manifest-записи. Затем GREEN, retained SDK checks, npm test, strict specs, полный owned diff, evidence/archive/commit. Не заменять проверки и не сужать их ради PASS. Новая инфраструктура контроля или production не создаётся. Offline PASS не доказывает live доступность, качество модели, latency или отсутствие любых сторонних agents.
