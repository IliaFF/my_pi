#!/usr/bin/env bash
# Installs real npm packages into temporary directories. Never contacts systemd.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
tmp="$(mktemp -d)"
trap 'rm -rf -- "$tmp"' EXIT
export PI_CODING_AGENT_DIR="$tmp/agent with spaces" PI_BACKUP_DIR="$tmp/backups" XDG_CONFIG_HOME="$tmp/config"
export SYSTEMCTL_LOG="$tmp/systemctl.log"
mkdir -p "$tmp/bin"
cat > "$tmp/bin/systemctl" <<'MOCK'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$SYSTEMCTL_LOG"
[[ "$2" != cat ]]
MOCK
chmod +x "$tmp/bin/systemctl"
export PATH="$tmp/bin:$PATH"

./install.sh --dry-run --with-openrouter
test ! -e "$PI_CODING_AGENT_DIR"
test ! -e "$SYSTEMCTL_LOG"
./install.sh
node scripts/test-background-jobs.mjs "$PI_CODING_AGENT_DIR/npm/node_modules"
node scripts/test-auto-ultra-compact.mjs "$PI_CODING_AGENT_DIR"
node scripts/verify-fold-window.mjs "$PI_CODING_AGENT_DIR"
python3 scripts/test-install-rollback.py
./uninstall.sh
test ! -e "$PI_CODING_AGENT_DIR/npm"
test ! -e "$PI_CODING_AGENT_DIR/extensions/providers"
test ! -e "$PI_CODING_AGENT_DIR/extensions/auto-ultra-compact"
test ! -e "$SYSTEMCTL_LOG"

printf '%s\n' '{"defaultThinkingLevel":"high","packages":[{"source":"npm:pi-ssh-remote@0.1.14","skills":[]}]}' > "$tmp/settings.before"
printf '%s\n' '{"providers":{"other":{},"openrouter":{"modelOverrides":{"another-model":{}}}}}' > "$tmp/models.before"
cp "$tmp/settings.before" "$PI_CODING_AGENT_DIR/settings.json"
cp "$tmp/models.before" "$PI_CODING_AGENT_DIR/models.json"
./install.sh --preserve-settings --with-openrouter
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const read = (name) => JSON.parse(readFileSync(join(process.env.PI_CODING_AGENT_DIR, name), 'utf8'));
const settings = read('settings.json');
assert.equal(settings.defaultThinkingLevel, 'high');
assert.equal(settings.packages.length, 15);
assert.deepEqual(settings.packages[0], { source: 'npm:pi-ssh-remote@0.1.15', skills: [] });
const { providers } = read('models.json');
assert.deepEqual(providers.other, {});
assert.deepEqual(providers.openrouter.modelOverrides['another-model'], {});
assert.equal(providers.openrouter.modelOverrides['deepseek/deepseek-v4.1-flash-1017'].maxTokens, 65536);
JS
grep -Fx -- '--user enable --now openrouter-cache-order.timer' "$SYSTEMCTL_LOG"
./uninstall.sh
cmp "$tmp/settings.before" "$PI_CODING_AGENT_DIR/settings.json"
cmp "$tmp/models.before" "$PI_CODING_AGENT_DIR/models.json"
test ! -e "$XDG_CONFIG_HOME/systemd/user/openrouter-cache-order.timer"
grep -Fx -- '--user disable --now openrouter-cache-order.timer' "$SYSTEMCTL_LOG"
echo 'PASS installation, preserved settings, OpenRouter opt-in and rollback'
