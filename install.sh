#!/usr/bin/env bash
# Installs a clean Pi: pinned core, pi-ssh-remote and the SSH host notes.
set -euo pipefail

PI_VERSION="1.5.2"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
BACKUP_ROOT="${PI_BACKUP_DIR:-$HOME/.pi/my-pi-backups}"
INSTALL_CORE=0
PRESERVE_SETTINGS=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: ./install.sh [--install-core] [--preserve-settings] [--dry-run]

--install-core       Install the pinned global Pi core when missing or mismatched.
--preserve-settings  Keep an existing settings.json.
--dry-run            Print the plan without touching the host.

Environment:
  PI_CODING_AGENT_DIR  Agent directory. Default: ~/.pi/agent
  PI_BACKUP_DIR        Backup directory. Default: ~/.pi/my-pi-backups
EOF
}

while (($#)); do
  case "$1" in
    --install-core) INSTALL_CORE=1 ;;
    --preserve-settings) PRESERVE_SETTINGS=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

for command in node npm patch tar; do
  command -v "$command" >/dev/null || { echo "FAIL missing command: $command" >&2; exit 1; }
done
node -e 'const [M]=process.versions.node.split(".").map(Number); if (M<24) process.exit(1)' || {
  echo "FAIL Node $(node --version). Required >=24.0.0" >&2; exit 1;
}

current_version=""
if command -v pi >/dev/null 2>&1; then current_version="$(pi --version 2>/dev/null || true)"; fi
if ((DRY_RUN)); then
  echo "DRY-RUN agent: $AGENT_DIR"
  echo "DRY-RUN Pi core: ${current_version:-missing} -> $PI_VERSION (install=$INSTALL_CORE)"
  echo "DRY-RUN packages: @earendil-works/pi-coding-agent, @earendil-works/pi-tui, pi-ssh-remote, 14 user packages (npm ci from package-lock.json)"
  echo "DRY-RUN patches: pi-ssh-remote+0.1.15, context-fold+0.8.0 (effective 170k fold window)"
  echo "DRY-RUN extension: extensions/auto-ultra-compact (170k compaction, 20000 retained)"
  echo "DRY-RUN configs: settings.json (15 packages, codemode, cache warming, compaction), AGENTS.md (SSH hosts)"
  exit 0
fi
if [[ "$current_version" != "$PI_VERSION" ]] && ((!INSTALL_CORE)); then
  echo "FAIL Pi core is '${current_version:-missing}', expected '$PI_VERSION'. Rerun with --install-core." >&2
  exit 1
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_ROOT"
backup="$(mktemp -d "$BACKUP_ROOT/${stamp}.XXXXXX")"
present=()
for item in settings.json AGENTS.md npm extensions; do
  [[ -e "$AGENT_DIR/$item" ]] && present+=("$item")
done
if ((${#present[@]})); then
  tar -C "$AGENT_DIR" -czf "$backup/agent-files.tar.gz" -- "${present[@]}"
else
  tar -czf "$backup/agent-files.tar.gz" --files-from /dev/null
fi

core_changed=0
rollback_install() {
  local rc="$?"; trap - ERR; set +e
  echo "FAIL install interrupted. Restoring backup: $backup" >&2
  tar -C "$AGENT_DIR" -xzf "$backup/agent-files.tar.gz" || echo "FAIL restore not confirmed; backup retained: $backup" >&2
  if ((core_changed)); then
    if [[ "$current_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+([+-][A-Za-z0-9._-]+)?$ ]]; then
      npm install --global --ignore-scripts "@earendil-works/pi-coding-agent@$current_version" >&2
    else
      npm uninstall --global @earendil-works/pi-coding-agent >&2
    fi
  fi
  exit "$rc"
}
trap rollback_install ERR

mkdir -p "$AGENT_DIR/npm"
cp "$ROOT/npm/package.json" "$AGENT_DIR/npm/package.json"
cp "$ROOT/npm/package-lock.json" "$AGENT_DIR/npm/package-lock.json"
npm ci --ignore-scripts --omit=dev --legacy-peer-deps --prefix "$AGENT_DIR/npm"

apply_patch() {
  local package_dir="$1" patch_file="$2" label="$3"
  if patch -d "$package_dir" -p1 --dry-run --forward --batch <"$patch_file" >/dev/null 2>&1; then
    patch -d "$package_dir" -p1 --forward --batch <"$patch_file" >/dev/null
    echo "PASS applied $label patch"
  elif patch -d "$package_dir" -p1 --dry-run --reverse --batch <"$patch_file" >/dev/null 2>&1; then
    echo "PASS $label patch already applied"
  else
    echo "FAIL $label patch does not apply; review $patch_file" >&2
    false
  fi
}

apply_patch "$AGENT_DIR/npm/node_modules/pi-ssh-remote" "$ROOT/patches/pi-ssh-remote+0.1.15.patch" pi-ssh-remote
apply_patch "$AGENT_DIR/npm/node_modules/context-fold" "$ROOT/patches/context-fold+0.8.0.patch" context-fold

mkdir -p "$AGENT_DIR/extensions/auto-ultra-compact"
cp "$ROOT/local-extensions/auto-ultra-compact/index.ts" "$AGENT_DIR/extensions/auto-ultra-compact/index.ts"
node "$ROOT/scripts/verify-fold-window.mjs" "$AGENT_DIR"

if ((!PRESERVE_SETTINGS)) || [[ ! -f "$AGENT_DIR/settings.json" ]]; then
  cp "$ROOT/configs/settings.json" "$AGENT_DIR/settings.json"
fi
if [[ ! -f "$AGENT_DIR/AGENTS.md" ]]; then
  cp "$ROOT/configs/AGENTS.md" "$AGENT_DIR/AGENTS.md"
elif ! grep -q '^## Удалённые хосты и вычислительные ресурсы' "$AGENT_DIR/AGENTS.md"; then
  echo "WARN existing AGENTS.md has no SSH host section; merge $ROOT/configs/AGENTS.md manually"
fi

[[ "$current_version" == "$PI_VERSION" ]] || {
  core_changed=1
  npm install --global --ignore-scripts "@earendil-works/pi-coding-agent@$PI_VERSION"
  hash -r
}
[[ "$(pi --version)" == "$PI_VERSION" ]] || { echo "FAIL Pi $PI_VERSION is not active on PATH" >&2; false; }

node "$ROOT/scripts/verify-rpc.mjs" "$AGENT_DIR"
printf '%s\n' "$backup" > "$AGENT_DIR/.my-pi-last-backup"
trap - ERR
echo "PASS installed clean Pi. Backup: $backup"
echo "Authenticate a provider separately. Restart Pi before use."
