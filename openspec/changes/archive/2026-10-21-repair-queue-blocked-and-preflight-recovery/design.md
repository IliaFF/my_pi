# Design

## Decisions

1. Сохранить append-only check records и существующий action supersede. Отдельный failed-preflight распознаётся только по current id/text, отсутствию before и jobId, status unknown и записанной непустой error. По порядку start() такая запись не могла вызвать bg_run: fingerprint обязан вернуть before раньше. Unknown без error, после получения before или job identity не подходит. Это правило совместимо с исторической записью aae74783.
2. Не запущенный preflight сам по себе не даёт PASS и блокирует direct evidence. Он может быть явно связан с последним стабильным успешным replacement с причиной; только здесь допускается смена cwd. Для ранее исполнявшихся успешных checks сохраняется same-cwd правило. Все цепочки, latest/task/text/lifecycle/running guards остаются.
3. validate() вычисляет fingerprints последних незаменённых endpoint checks, а assertFreshChecks проверяет все зависимости и цепочки. Невалидная связь всё равно отклоняется; старый заменённый scope не читается. inspect продолжает наблюдать все running jobs.
4. reopen доступен только явно для Blocked id с reason и пустым current, без смены Pending order. Не запускать модель/команду автоматически. Предварительно наблюдать jobs этого id и отказать при running. После атомарной мутации TODO записать lifecycle boundary с причиной. Реконструкция checks текущего lifecycle начинается после boundary; прежние entries остаются в getBranch. complete после reopen требует хотя бы один новый recorded check и все его guards, в том числе в новой сессии без старой истории. Resume/release не стирают это обязательство.
5. Source/installed runtime не смешивать. Нужные root TODO операции можно выполнить isolated actual SDK с новым source extension, in-memory faux provider, без пользовательских настроек/credentials; после завершения основной задачи и строго по одному id. Не править старые сессии и не переносить checks между ними.

## Scope and risks

Затронуты callers assertFreshChecks/queueChecks, экспорт core, action schema/help/slash и existing SDK fixtures. Панель только отображает новое состояние; storage/locking не меняются. Явная смена scope не доказывает полноту replacement: причина и command обязательны, агент обязан выбирать содержательную проверку. Reopen требует повторного evidence, а не одобряет старые PASS. Нельзя удалять исторические failures либо объявлять offline результаты live доказательством. Установка исправления в runtime требует отдельного согласования.
