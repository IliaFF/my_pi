#!/usr/bin/env bash
# Installs the pinned Pi extension stack.
set -euo pipefail

PI_VERSION="1.5.2"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(realpath -m -- "${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}")"
SYSTEMD_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
BACKUP_ROOT="${PI_BACKUP_DIR:-$HOME/.pi/my-pi-backups}"
INSTALL_CORE=0
PRESERVE_SETTINGS=0
DRY_RUN=0
WITH_OPENROUTER=0

usage() {
  cat <<'EOF'
Usage: ./install.sh [--install-core] [--preserve-settings] [--with-openrouter] [--dry-run]

--install-core       Install the pinned global Pi core when missing or mismatched.
--preserve-settings  Keep existing settings and package filters; add all managed packages.
--with-openrouter    Install the DeepSeek route and enable its user timer.
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
    --with-openrouter) WITH_OPENROUTER=1 ;;
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
  echo "DRY-RUN packages: 15 extensions from configs/extension-profile.json (npm ci)"
  echo "DRY-RUN patches: pi-ssh-remote+0.1.15, context-fold+0.8.0"
  echo "DRY-RUN local extensions: providers, auto-ultra-compact"
  echo "DRY-RUN OpenRouter route and timer: $WITH_OPENROUTER"
  exit 0
fi
if [[ "$current_version" != "$PI_VERSION" ]] && ((!INSTALL_CORE)); then
  echo "FAIL Pi core is '${current_version:-missing}', expected '$PI_VERSION'. Rerun with --install-core." >&2
  exit 1
fi

if ((WITH_OPENROUTER)); then
  command -v systemctl >/dev/null
  systemctl --user show-environment >/dev/null
  for unit in openrouter-cache-order.{service,timer}; do
    if [[ -e "$SYSTEMD_DIR/$unit" || -L "$SYSTEMD_DIR/$unit" ]] || systemctl --user cat "$unit" >/dev/null 2>&1; then
      echo "FAIL $unit already exists. Keep your existing timer or remove it before using --with-openrouter." >&2
      exit 1
    fi
  done
fi
for dir in npm extensions scripts; do
  if [[ -L "$AGENT_DIR/$dir" ]]; then
    echo "FAIL refusing to install through a symlink: $AGENT_DIR/$dir" >&2
    exit 1
  fi
done

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_ROOT"
backup="$(mktemp -d "$BACKUP_ROOT/${stamp}.XXXXXX")"
managed=(settings.json npm extensions/providers extensions/auto-ultra-compact scripts/openrouter-cache-order.mjs .my-pi-last-backup)
if ((WITH_OPENROUTER)); then managed+=(models.json); fi
printf '%s\n' "${managed[@]}" > "$backup/managed-files"
printf '%s\n' "$AGENT_DIR" > "$backup/agent-dir"
present=()
for item in "${managed[@]}"; do
  if [[ -e "$AGENT_DIR/$item" || -L "$AGENT_DIR/$item" ]]; then present+=("$item"); fi
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
  PI_CODING_AGENT_DIR="$AGENT_DIR" "$ROOT/uninstall.sh" --backup "$backup" || echo "FAIL restore not confirmed; backup retained: $backup" >&2
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
rm -f -- "$AGENT_DIR/npm/package.json" "$AGENT_DIR/npm/package-lock.json"
cp "$ROOT/npm/package.json" "$AGENT_DIR/npm/package.json"
cp "$ROOT/npm/package-lock.json" "$AGENT_DIR/npm/package-lock.json"
npm ci --ignore-scripts --omit=dev --legacy-peer-deps --prefix "$AGENT_DIR/npm"

for spec in pi-ssh-remote+0.1.15 context-fold+0.8.0; do
  patch -d "$AGENT_DIR/npm/node_modules/${spec%+*}" -p1 --forward --batch < "$ROOT/patches/$spec.patch"
done

mkdir -p "$AGENT_DIR/extensions" "$AGENT_DIR/scripts"
for extension in providers auto-ultra-compact; do
  rm -rf -- "$AGENT_DIR/extensions/$extension"
  cp -R -- "$ROOT/extensions/$extension" "$AGENT_DIR/extensions/"
done
rm -f -- "$AGENT_DIR/scripts/openrouter-cache-order.mjs"
cp -- "$ROOT/scripts/openrouter-cache-order.mjs" "$AGENT_DIR/scripts/"
node "$ROOT/scripts/configure-install.mjs" settings "$ROOT" "$AGENT_DIR" "$PRESERVE_SETTINGS"


[[ "$current_version" == "$PI_VERSION" ]] || {
  core_changed=1
  npm install --global --ignore-scripts "@earendil-works/pi-coding-agent@$PI_VERSION"
  hash -r
}
[[ "$(pi --version)" == "$PI_VERSION" ]] || { echo "FAIL Pi $PI_VERSION is not active on PATH" >&2; false; }

node "$ROOT/scripts/verify-rpc.mjs" "$AGENT_DIR"
if ((WITH_OPENROUTER)); then
  mkdir -p "$SYSTEMD_DIR"
  printf '%s\n' "$SYSTEMD_DIR" > "$backup/systemd-dir"
  node "$ROOT/scripts/configure-install.mjs" openrouter "$ROOT" "$AGENT_DIR" "$SYSTEMD_DIR"
  systemctl --user daemon-reload
  systemctl --user enable --now openrouter-cache-order.timer
fi
rm -f -- "$AGENT_DIR/.my-pi-last-backup"
printf '%s\n' "$backup" > "$AGENT_DIR/.my-pi-last-backup"
trap - ERR
echo "PASS installed the full Pi extension stack. Backup: $backup"
echo "Authenticate a provider separately. Restart Pi before use."
