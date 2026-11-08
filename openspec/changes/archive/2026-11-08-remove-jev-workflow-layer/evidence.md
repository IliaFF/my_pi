# Evidence

## Scope

Удаление откатанного Jev/DeepSeek-контура из сборки: `local-extensions/jev-review`, установка и манифест, два обязательных этапа gate, спеки `deepseek-workflow-assistance`, `portable-user-stack`, `build-validation`.

Личный runtime приведён в согласованное состояние отдельным действием до открытия change: `~/.pi/agent/extensions/jev-review` и `~/.pi/agent/jev-review` перемещены в `~/.pi/my-pi-backups/jev-review-removed-20261108T173437Z/`.

## Failing regression first

- Добавлены контракты в `scripts/test-portable-stack.mjs` (нет `local-extensions/jev-review`, нет записей `extensions/jev-review/*` в `manifest.json`, нет упоминания в `install.sh` и `scripts/test-build.py`).
- До правок: `node scripts/test-portable-stack.mjs` → exit 1, `AssertionError` на `existsSync(.../local-extensions/jev-review)` (лог `/tmp/jev-regression-before.log`).

## Targeted results after the change

| Проверка | Результат |
| --- | --- |
| `node scripts/test-portable-stack.mjs` | PASS |
| `python3 scripts/test-install-rollback.py` | PASS (включая отказ на неизвестных managed-путях и restore npm link/hardlink) |
| `python3 -m unittest discover -s tests -p '*_test.py'` | 95 тестов, OK |
| `bash uninstall.sh --backup ~/.pi/my-pi-backups/20261108T171224Z.YTUeJ0 --dry-run` | PASS: реальный бэкап с расширением по-прежнему восстанавливается |
| `openspec validate --all --strict --no-interactive` | 31/31 items, 0 failed |

Первый полный прогон gate упал: `installer_restore_test` строит исторические allowlist-наборы вычитанием новых путей из `install.sh`, и после удаления `extensions/jev-review` из `managed` эти наборы перестали совпадать со снимками `uninstall.sh`. Исправление внесено в тест (`RETIRED_MANAGED` возвращается ровно в три доретайрных набора), проверки не ослаблены: исторический бэкап с расширением принимается, текущий набор без него тоже.

## Full gate

`npm test` (чистый запуск без pipe), exit code 0: 27 checks, 0 failed — `test-results/results.json`, лог `.pi/tasks/01a1bc2a-e2a7-723b-82ad-b0a26d388bde-608041/b4ab79034.output`. Включает `openspec` validation, `harness` (95 unittest), `release`, `install-rollback`, `portable-stack`, `stack-bootstrap`, патчи и SDK-интеграции, `rpc-startup`.

## Ограничения

- Платные запросы не выполнялись; сеть в gate не использовалась.
- CI job для этого коммита не запускался — не проверено.
- Проверки писаны тем же исполнителем, что и правки; независимого контроля нет.
- Поведение агента на реальных задачах этим gate не измеряется; ссылка на A/B — внешний отчёт `reports/new-pi-ab-jev-20261108.md` в родительском репозитории, в Git сборки не копируется.
- Production-установка выполняется отдельным согласованным шагом после коммита и в evidence этого change не входит.
