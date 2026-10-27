# Context
Проверены локальные официальные README, quickstart, CLI, environment-variables, configuration, settings, security. npm registry latest = 1.4.0, Node = 24.18.0; current global CLI = 1.3.0, personal SDK = 1.4.0. Эти версии не выравниваются.

# Decisions
- Установка npm --prefix ~/.local/share/pi-demo/runtime --ignore-scripts, exact 1.4.0, без global install. npm lock остаётся только в demo runtime.
- HOME=~/.local/share/pi-demo/home, PI_CODING_AGENT_DIR=~/.local/share/pi-demo/agent, cwd=~/.local/share/pi-demo/workspace. Launcher ~/.local/bin/pi-demo; все назначения проверяются на отсутствие конфликтов.
- env -i исключает текущие credentials и PI/NODE/XDG overrides. Сохраняются только явно выбранные PATH, TERM, LANG; node разрешается до очистки окружения. Текущие shell startup files не копируются.
- Не использовать --no-extensions: это выключает встроенные builtin:mcp, builtin:llama.cpp, builtin:codemode и builtin:tool-search. Не отключать skills глобально: в новом HOME/agent/workspace их изначально нет, впоследствии пользователь может добавлять их штатно.
- Проверить родительские context files и shared skill paths. Запуск всегда переходит в demo workspace, даже из текущего проекта.
- Авторизация только отдельным /login по решению пользователя. Automatic telemetry отключается для demo; offline используется в проверках, не фиксируется для обычного запуска.

# Risks
Это конфигурационная изоляция, не sandbox: процесс остаётся под root и built-in bash может обратиться к другим файлам. Каталоги demo защищены chmod 700. npm install без lifecycle scripts соответствует официальным docs, но не даёт pinned transitive upstream release bundle; локальный lock сохраняет фактическое дерево. Автоматическое обновление текущего Pi не запускается.

# Validation
Реальный новый CLI --version/--help/list, SDK resource inspection и RPC get_state/get_commands без prompt, offline и Node network guard. Проверить отсутствие сторонних extensions, skills, prompts/context/auth, сохранность core tools и встроенных extensions. Полный npm test проверяет прежний source stack отдельно; он не доказывает качество модели или live доступность. Сверить hashes current settings/auth/npm metadata и global package. Просмотреть весь owned diff, не включать чужой TODO и untracked runtime/logs в commit.
