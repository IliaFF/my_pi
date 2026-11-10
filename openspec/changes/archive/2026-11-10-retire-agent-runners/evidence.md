# Evidence

## Baseline

`main` был впереди `origin/main` на 5 коммитов; рабочее дерево содержало незакоммиченную миграцию pi-subagents → pi-herdr-agents и untracked change `reduce-context-with-herdr`. Снимок исходного состояния: `/home/ilyaz/.pi/backups/retire-agent-runners-source-20261110/baseline.txt`. Решение оператора: убрать все агентские раннеры и в Herdr, и в базовой сборке, но не трогать стандартный Herdr (`stack/lock.json`, CLI/сервер). Change `reduce-context-with-herdr` заменён этим; retired правка не откатывалась отдельным коммитом.

## Regression first

`scripts/test-no-agent-runners.mjs` добавлен до правок и падал на исходном source с `npm/package.json still pins pi-herdr-agents` (RED). После удаления раннеров и проводки в `scripts/test-build.py` (`unit/agent-runners`) он проходит (GREEN).

## Source gate

`npm test` (полный обязательный gate): PASS, 28 проверок, exit 0. В том числе `contract/openspec`, `unit/harness`, `unit/release`, `unit/agent-runners`, `unit/portable-stack`, `integration/patch-apply`/`patch-verify`, `integration/deferred-tools-sdk`, `integration/firstmate-policy-sdk`, `integration/context-runtime`, `smoke/rpc-startup`. Проверки retired адаптеров `terminal-install` и `terminal-sdk` из gate удалены, а не отключены: скрипты, их fixtures и пакетные патчи удалены вместе с компонентами.

`openspec validate --all --strict --no-interactive`: PASS.

## Removed from the build

Пакеты pi-subagents и pi-herdr-agents (npm-манифест, lock, settings), `configs/subagent`, `configs/herdr-agents`, `configs/agents/terminal.md`, `local-extensions/herdr-agent-state.ts`, `scripts/install-terminal-subagent.mjs`, `test-terminal-*`, `test-herdr-*`, `herdr-child-fixture.mjs`, `no-network-fake-herdr.cjs`, `evaluate-{subagents,herdr-spawn,long-lived-agents,durable-child}.mjs`, `patches/pi-herdr-agents+3.3.1.patch`, `tests/herdr_adoption_test.py`, `tests/multiwindow_policy_test.py`, Herdr-agents docs. `deferred-tools.ts` больше не восстанавливает агентские имена. `configs/APPEND_SYSTEM.md` содержит один абзац «делегирование отключено» вместо разделов long-lived delegation и terminal-workflow.

Установщик сохраняет обратную совместимость без поддержки компонентов: `install.sh` удаляет известные пути раннеров из сохранённого профиля и вычищает их декларации пакетов, а `uninstall.sh` принимает исторический набор путей (`retired_runners`) для восстановления старых backup.

## Runtime deployment

Первый `./install.sh --preserve-settings --skip-stack` остановился на защитной проверке: живые `skills/cpp-styleguide/SKILL.md` и `skills/python-styleguide/SKILL.md` были новее source-шаблонов, installer отказался их перетирать и восстановил backup `20261110T184140Z.DuyDff`. По решению пользователя живые версии заменены source-шаблонами; копии сохранены в `/home/ilyaz/.pi/my-pi-backups/skills-before-retire-20261110/`.

Повторный `./install.sh --preserve-settings --skip-stack`: PASS, backup `/home/ilyaz/.pi/my-pi-backups/20261110T184350Z.BIr76b`. Ядро Pi не менялось (1.5.0 == 1.5.0). После установки: в `packages` нет pi-subagents/pi-herdr-agents, `npm/node_modules` без этих пакетов, пути `extensions/subagent`, `herdr-agents`, `agents/terminal.md`, `extensions/herdr-agent-state.ts` отсутствуют. Дополнительно из личного `settings.json` удалён retired блок `subagents` (копия файла в каталоге skills-before-retire) и пустой каталог `agents/`.

`python3 scripts/maintenance.py verify`: failures=0, warnings=4 (сохранённые личные settings/mcp/APPEND — audit-only). Host gate `npm test -- --agent /home/ilyaz/.pi/agent`: PASS, incl. `integration/host-drift`.

## Not verified

Pi не перезапускался: новые декларации инструментов и отсутствие агентских панелей увидны только в новой сессии. Live-провайдеры, модели, Herdr UI/sidebar, Firstmate и CI не запускались. Откат источника — Git; откат runtime — `./uninstall.sh --backup /home/ilyaz/.pi/my-pi-backups/20261110T184350Z.BIr76b`.
