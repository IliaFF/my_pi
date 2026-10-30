# Why
Stock updates previously removed local patches. The user authorizes a daily isolated VPS agent using the existing VPS Codex subscription, automatic acceptance only after checks, and Telegram via existing Hermes. PC runtime and existing VPS applications stay unchanged.

# What Changes
Add a root-controlled updater with npm release detection, bounded non-root repair and credential-free gate, protected acceptance scope, exact-commit GitHub Actions verification and fast-forward-only publication. Persist pending CI, retry budget and notification outbox across restarts. Generalize release version checks without removing behavioral contracts.

# Capabilities
## New Capabilities
- `vps-stack-updates`: daily isolated repair and checked publication.
## Modified Capabilities
- `build-validation`: release checks follow exact candidate pins instead of historical version literals.

# Impact
New Python stdlib controller, tests, systemd units, deployment documentation, mandatory unit discovery. Dedicated Node/Pi runtime and two unprivileged VPS users; root SSH and Hermes credentials are never given to the repair or test user. An explicitly authorized legacy OAuth copy proved incompatible with Pi 1.3; use a separate ChatGPT subscription OAuth login instead, preserving its clientId/scopes. No production installation, PC updates, API-key fallback or new bot.
