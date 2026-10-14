# Latest stable runtime alignment

## Why
Runtime SDK peers отстали от core 1.2.0, RPIV patch и loop-profiler отличаются от проверенного source. Пользователь разрешил latest stable npm releases, backup и установку без платных запросов. Registry /latest сверён для 24 direct runtime/tooling dependencies; prerelease не выбран. Ядро и Chrome MCP уже latest.

## What Changes
Обновить browser-use 0.1.22→0.1.26, ssh-remote 0.1.14→0.1.15, typebox 1.3.34→1.3.37, OpenSpec 1.14.0→1.14.1, exact locks и SSH/browser settings pins. Добавить install --preserve-settings: сохранить личные settings/APPEND/context policy, обновить только известные pinned package references. Согласовать SDK peers с core 1.2.0, применить source patches/managed extensions после backup. Source/host gate, CI и restart boundary обязательны.

## Capabilities
### Modified Capabilities
- build-validation: installed archive must not require source Git metadata for isolated unit tests.
- build-governance: preserving personal configuration during explicitly approved installation.

## Impact
install.sh, config preservation regression, locks, config pins, release assertions, README/diagnostics. Auth/sessions/context stores не заменять. ОС, Node и браузер не обновлять. Live provider/Telegram/Chrome/SSH не проверять. Loaded текущая сессия продолжает старый код до restart.
