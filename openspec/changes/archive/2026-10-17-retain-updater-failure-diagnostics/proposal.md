# Why
The authorized live repair after the settings fix was killed by signal25/XFSZ. The controller retained an empty agent log because --print emits only final assistant text, then removed the ephemeral workspace. The failing file/operation is unknown. The generic sandbox failure notification hides trusted service status and cannot guide a safe fix.

# What Changes
Run repair in native Pi JSON event mode so private tool-start/progress events survive abrupt termination. Capture bounded, allowlisted systemd worker/launcher status before cleanup in a private JSON sidecar. Preserve the original 64 MiB per-file/output budgets and deadlines. Report trusted signal/exit/timeout categories without forwarding model text or command arguments. Retain failed worker metadata until collected, then stop/reset units.

# Capabilities
## New Capabilities
None.
## Modified Capabilities
- `vps-stack-updates`: private streaming progress and truthful structured sandbox-failure diagnostics.

# Impact
scripts/vps-updater.py, existing updater regressions and deployment docs. New offline cases use actual capped subprocesses without providers, credentials, SSH or systemd side effects. Global SDK/CLI gate remains mandatory. No automatic retry, permissions/resource increase, publication or VPS deployment without separate approval. This fixes the observability failure; it does not identify the historical XFSZ file or prove the next migration succeeds.
