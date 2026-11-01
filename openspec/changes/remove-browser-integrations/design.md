# Design

## Context

См. proposal.md, Why. До изменений: HEAD 6d44d44; origin/main 118b4e3, divergence 2/2. Наши commits сохраняются merge, не reset/rebase. Снимок tracked/untracked работы находится вне Git: /root/.pi/pi-update-initial.ws07po. Посторонний TODO diff, .pi/tasks и Canary не включаются в commits.

В runtime обнаружены pi-browser-use@0.1.33 (extension отключён), settings key pi-browser-use, MCP chrome/jev-browser/paper-search и bin/jev-browser. Есть один private stack store 8869ae7da95170063bfd. Его содержимое и объём ещё не инвентаризированы. Наличие системного Chrome не является разрешением на его удаление.

## Goals / Non-Goals

**Goals:** минимальная полная миграция в рамках portable-user-stack; удаление browser integrations, а не всех упоминаний browser в истории. Сохранение локальных queue fixes и upstream installer improvements.

**Non-Goals:** новый full-stack deployment ради проверки, изменение моделей/авторизации, удаление системных браузеров, пользовательских профилей или shared caches. Пользователь отдельно выбрал оставить pi-markdown-preview и pi-web-access полностью без изменений, включая встроенные опциональные browser launch/cookie функции. Их browser hooks не входят в removal scope.

## Decisions

1. Перед merge повторить fetch/status и проверить актуальный origin. Сохранённый чужой TODO diff переносить без staging или сброса; если merge требует чистый TODO, временно сохранить только его с проверенным восстановлением. Merge сохраняет 591bf09/6d44d44 в ancestry; конфликты install.sh/test-portable-stack разрешаются по поведению: exact-known-block миграция AGENTS плюс upstream --skip-stack/540s.
2. Удалить browser pins и registry entries из npm/configs, согласованно пересчитать lock без обновления unrelated direct pins. Удалить Jev-only stack npm environment/provisioning и browser launcher. Исторические rollback allowlists, необходимые для старых backup, оставить с пояснением; release не должен использовать их для новой установки browser components. Не удалять историю OpenSpec как будто прежних релизов не было.
3. Использовать существующий guarded installer и preservation logic, добавив точечное удаление browser registrations/settings/MCP entries. Не заменять весь settings/mcp файл дефолтом. Проверить сохранение неизвестных servers, package forms (string/object), provider/model и приватных полей. Проверять symlinks и типы до записи/удаления; неизвестные browser targets не удалять по substring имени.
4. Изменение stack lock меняет stackIdentity; обычный preflight откажет существующему launcher Firstmate. Для личной установки использовать upstream --skip-stack: сохранить действующий Firstmate/paper-search в старом store, не создавать новое окружение. Адресно перенести только проверенные Jev MCP/npm, managed browser binary payloads и точный legacy launcher в приватный quarantine backup на том же filesystem, не весь stack store. Используется отдельный scripts/retire-browser-stack.mjs после успешного installer; rename сохраняет байты/права и journal позволяет восстановить частично перемещённые paths. Fresh bootstrap уже browser-free. Это дешевле и безопаснее копирования/переустановки Firstmate с его runtime.
5. До удаления проверить объём и свободное место и создать приватный backup всех затрагиваемых configs/npm/maintenance/core и browser payloads. Installer backup не покрывает stack: дополнительный payload backup должен покрыть именно удаляемые части, сохранять права и иметь проверенную возможность restore. Не считать installer archive достаточным для stack cleanup. Browser binaries удаляются только после классификации как managed distribution, без пользовательских профилей; при сомнении остановиться, не расширять scope.
6. Проверки переиспользуют test-portable-stack, stack-bootstrap, portable-configs, install-preservation, release и rollback fixtures; добавить failing regression до исправлений. SDK/RPC gates остаются настоящими, без подмены callbacks. После установки отдельно проверить actual CLI/SDK pins, SSH extension presence, paper wrapper/environment integrity, отсутствие browser registrations и private config hashes. Не делать live MCP/model calls.

## Risks / Trade-offs

- [Backup stack не входит в installer archive] → отдельное сохранение удаляемых payloads до удаления и regression restore, без удаления Firstmate store.
- [npm ci может удалить личные extras] → сверить npm manifests и механизм сохранения extras до установки; не применять blind clean.
- [Новый source stack identity отличается от сохранённого runtime] → явно записать legacy store path и --skip-stack в evidence; не выдавать свежий bootstrap за проверенный live deployment.
- [В памяти текущей сессии остаются старые MCP schemas/processes] → нужен restart Pi после обновления; изменение файлов не является hot reload.
- [Чужой TODO diff случайно попадёт в commit] → selective staging только owned diff, проверка staged diff относительно исходного snapshot.
- [Непроверенная CI/live доступность] → отдельно отметить как непроверенную, offline PASS не доказывает live работоспособность.

## Migration Plan

Merge → failing regression → source removal/tests/spec updates → full npm test и diff review → проверенный backup → install --preserve-settings --install-core --skip-stack и scoped browser cleanup → offline host verification → evidence/tasks → source/specs/tests commit и push без force. Если deployment не проходит, восстановить backup по docs/diagnostics-and-rollback.md с отдельным восстановлением browser payloads; проверить результат, не повторять установку вслепую. Новое существенное расширение затрат требует согласования пользователя.
