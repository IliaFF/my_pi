# Перенос текущей сборки на Pi 1.0.0

Включены exact installed версии: 23 direct dependencies, SSH pi-ssh-remote 0.1.14, pi-train-agents 0.2.7 с ручным global-rule workflow, Jev review и условно активный Herdr TUI hook. Coding tools остаются direct; native codemode включён, Chrome tools скрыты за codemode. Установщик сохраняет существующие MCP servers/Chrome и train-agents config, новые managed paths включены в backup/rollback. Прежние backup sets также поддержаны uninstall.

## Проверки

- Release validator: PASS; три patch replay, exact lock, context policy, known-secret/runtime scan, compaction/profiler/queue/reader checks. Queue: 15 passed; reader: 9 passed.
- Installer config check: PASS, custom agent path и сохранение существующих MCP/train configs.
- Jev offline regression: 14 passed, включая безопасные error reasons; classifier/provider — fake, платных запросов нет.
- Train-agents offline regression: PASS, source-bound quotes, scope/cache, exclusion, freshness, manual approval, atomic write/backup.
- Изолированная установка: exit 0, verify failures=0 warnings=1. Ожидаемое предупреждение — audit drift mcp.json: сохранён тестовый existing server, путь Chrome MCP адаптирован к временному agent directory. Это не ошибка установки.
- Fresh isolated RPC: exit 0, stderr empty, 61 команда; remote/jev-review/mcp/queue/context-fold/train-agents присутствуют; tools/browser-tools отсутствуют. Запросы только get_state/get_commands, без генерации.
- Изолированный uninstall: exit 0, исходный MCP config восстановлен; новые пакеты, Jev и train config удалены.

Реальное SSH-подключение, внешний Jev и GUI Herdr в этом release pass не проверялись. Chrome browser workflow ранее отдельно проверен на Pi 1.0.0; текущий RPC smoke подтверждает только запуск.

Секреты, auth, sessions, caches/databases, SSH endpoints/known hosts/server memory и provider model catalog не публикуются. Host-specific models.json (cloud folder IDs и credential shell commands) также исключён. Авторизация, Chrome и Herdr устанавливаются отдельно. npm audit сообщает известный high в brace-expansion из upstream Pi shrinkwrap; автоматический audit fix не применялся.
