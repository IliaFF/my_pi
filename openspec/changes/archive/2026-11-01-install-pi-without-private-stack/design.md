## Scope
SKIP_STACK defaults to zero. --skip-stack skips both install-stack.mjs preflight and bootstrap; Pi dependency/core handling, source/host gates, backup/rollback, skills and user instructions remain unchanged. Personal config receives the mode through the SKIP_STACK environment variable (preserving the existing extraction harness and Python argument contract) and omits only missing jev-browser/paper-search defaults, preserving all existing servers.

## Verification
Observe --skip-stack --help fail before changing the parser. Exercise both actual shell guard blocks with a node stub that fails if invoked; full mode must invoke it, Pi-only mode must not. Exercise the actual personal-config shell/Python section in both modes. Complete npm test, installer host gate and backup checks remain mandatory. Tests do not prove live provider/MCP/browser availability.

## Data and rollback
Do not remove Playwright packages from unrelated projects, shared browser caches or existing independent installations. Retain incomplete new private stack for inspection; Pi-only mode neither activates nor modifies it.
