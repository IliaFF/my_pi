## Decisions
Use a clean git archive of 40c8dfe with the existing installer, --preserve-settings --install-core. Installer backs up managed files; separately back up ~/.bashrc before updating its two legacy overrides. Core and managed dependency versions are unchanged. Keep private settings/credentials byte-identical. Run full installed offline gate. Existing Pi processes keep their inherited environment and loaded extensions until restart; no automatic process termination.

## Rollback
Use installer backup and uninstall.sh per docs/diagnostics-and-rollback.md. Restore the separately backed-up .bashrc if required. Do not claim a running process was hot-reloaded.
