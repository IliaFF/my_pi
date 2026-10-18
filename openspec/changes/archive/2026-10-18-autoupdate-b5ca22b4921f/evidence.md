# Verification evidence

## Scope and baseline

- Date: 2026-10-18. Рабочая копия без Git metadata; revision неизвестен. Commits, push, deployment и live provider requests не выполнялись.
- Прочитаны AGENTS.md и build-validation/build-governance/vps-stack-updates specs до изменения source; change создан локальным OpenSpec 1.14.1.
- Единственное расхождение до правки: pine-of-glass 0.17.0 вместо target 0.18.0. Это version-only update, не исправление нового поведенческого бага; failing regression не добавлялся, защищённые тесты не менялись.

## Changes reviewed

- npm/package.json: только exact pine-of-glass pin 0.17.0 → 0.18.0.
- npm/package-lock.json: только root declaration и pine-of-glass version/resolved/integrity. Transitive graph не изменился.
- Для проверки полного npm diff восстановлен предыдущий lock в ignored test-results/lock-review; SHA-256 обоих восстановленных файлов совпал с исходными hashes. Unified diff проверен; allowScripts, package names и scripts не изменились.
- README.md: актуализированы release versions, количество patches, указание на сохранённые exact settings pins и безопасная tooling install command. Runtime contract не изменён.
- Baseline hash scan: все существующие файлы, кроме этих трёх, byte-identical. В частности tests/, scripts/, configs/ (включая подготовленный settings.json), .github/, AGENTS.md, root package files, manifest, installer, local extensions, patches и существующие OpenSpec specs/history не изменены.
- Все 19 user targets проверены на точное совпадение с dependency declarations, root lock declarations, locked package resolutions и установленными package versions. Core и TUI остаются 1.3.0, typebox 1.4.2; pine-of-glass 0.18.0.

## Commands and gate

- `npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund`: PASS для root tooling.
- `npm install --package-lock-only --ignore-scripts --legacy-peer-deps --no-audit --no-fund --prefix npm`: PASS.
- `npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund --prefix npm`: PASS, 405 packages. Lifecycle scripts не запускались.
- `npm test`: PASS дважды, включая повтор после README и evidence review, 16/16 checks в каждом запуске, exit 0. Node v24.18.0, Python 3.12.3, OpenSpec 1.14.1.
- PASS: openspec strict validation, CI config, harness, release (включая pristine published patch replay), loop pilot, patch apply, patch verify, stack surface, deferred tools SDK, train agents, queue SDK, Ponytail SDK, background jobs, loop SDK, context runtime и RPC startup.
- Meantime command/headless guard/fake-UI timer reload/shutdown cleanup PASS без provider calls.
- Машинный результат и bounded logs находятся только в ignored test-results/, не в source evidence.

## Limits

- CI не запускался и не подтверждён; controller выполняет commits/acceptance отдельно.
- Offline/fake-provider/fake-UI проверки не доказывают live provider transport, качество ответов, реальные UI rendering/latency, Chrome или SSH.
- Существующий quota probe сообщает: legacy supported, но новый OpenAI-only gpt-6.1-sol credential format не поддерживается pi-zai-usage 1.1.0. Это сохранённое ограничение, не причина менять защищённые configs или авторизацию.
- npm audit не выполнялся. Paid API keys, личные settings/auth/sessions/logs не читались и не добавлялись в исходники.
- Архивация выполняется только после полного PASS через OpenSpec `archive --skip-specs`, чтобы сохранить защищённые existing specs; scenario delta остаётся в архиве, не применяется к main specs этим агентом.
