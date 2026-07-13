#!/usr/bin/env bash
set -euo pipefail

PI_VERSION="0.80.6"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
BACKUP_ROOT="${PI_BACKUP_DIR:-$HOME/.pi/my-pi-backups}"
INSTALL_CORE=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: ./install.sh [--install-core] [--dry-run]

--install-core  Install exact global Pi core with npm when missing or mismatched.
--dry-run       Validate release and print planned changes without modifying host.

Environment:
  PI_CODING_AGENT_DIR  Target agent directory. Default: ~/.pi/agent
  PI_BACKUP_DIR        Rollback backup directory. Default: ~/.pi/my-pi-backups
  PI_CODING_AGENT_CORE_DIR  Optional Pi core path used by maintenance verifier.
EOF
}

while (($#)); do
  case "$1" in
    --install-core) INSTALL_CORE=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

for command in node npm python3 patch tar; do
  command -v "$command" >/dev/null || { echo "FAIL missing command: $command" >&2; exit 1; }
done

node -e 'const [M,m]=process.versions.node.split(".").map(Number); if (M<22 || (M===22 && m<19)) { console.error(`FAIL Node ${process.versions.node}. Required >=22.19.0`); process.exit(1) }'
python3 "$ROOT/scripts/test-release.py" "$ROOT"

current_version=""
if command -v pi >/dev/null 2>&1; then
  current_version="$(pi --version 2>/dev/null || true)"
fi

if ((DRY_RUN)); then
  echo "DRY-RUN agent directory: $AGENT_DIR"
  echo "DRY-RUN Pi core: ${current_version:-missing} -> $PI_VERSION"
  echo "DRY-RUN install core: $INSTALL_CORE"
  echo "DRY-RUN extensions: npm ci from exact package-lock.json"
  echo "DRY-RUN configs: settings, APPEND_SYSTEM, tools, quotas, fast-resume, Canary"
  echo "DRY-RUN patches: 5 exact-version patches"
  exit 0
fi

if [[ "$current_version" != "$PI_VERSION" ]] && ((!INSTALL_CORE)); then
  echo "FAIL Pi core is '${current_version:-missing}', expected '$PI_VERSION'. Rerun with --install-core." >&2
  exit 1
fi

managed=("settings.json" "APPEND_SYSTEM.md" "extensions/tools.ts" "extensions/pi-fast-resume.json" "extensions/quotas.json" "npm" "maintenance")
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_ROOT"
backup="$(mktemp -d "$BACKUP_ROOT/${stamp}.XXXXXX")"
state="$backup/state.json"
python3 - "$AGENT_DIR" "$backup" "$current_version" <<'PY'
import json, sys
from pathlib import Path
agent, backup, old_core = Path(sys.argv[1]).resolve(), Path(sys.argv[2]), sys.argv[3]
targets = ["settings.json", "APPEND_SYSTEM.md", "extensions/tools.ts", "extensions/pi-fast-resume.json", "extensions/quotas.json", "npm", "maintenance"]
present = [item for item in targets if (agent / item).exists()]
(backup / "state.json").write_text(json.dumps({"agentDir": str(agent), "present": present, "oldCoreVersion": old_core}, indent=2) + "\n")
PY

mapfile -t present < <(python3 -c 'import json,sys; print("\n".join(json.load(open(sys.argv[1]))["present"]))' "$state")
if ((${#present[@]})); then
  tar -C "$AGENT_DIR" -czf "$backup/agent-files.tar.gz" -- "${present[@]}"
  tar -tzf "$backup/agent-files.tar.gz" >/dev/null
fi

core_changed=0
rollback_install() {
  local rc="$?"
  trap - ERR
  set +e
  echo "FAIL install interrupted. Restoring backup: $backup" >&2
  for item in "${managed[@]}"; do rm -rf "$AGENT_DIR/$item"; done
  if [[ -f "$backup/agent-files.tar.gz" ]] && tar -tzf "$backup/agent-files.tar.gz" >/dev/null 2>&1; then
    mkdir -p "$AGENT_DIR"
    tar -C "$AGENT_DIR" -xzf "$backup/agent-files.tar.gz"
  fi
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

mkdir -p "$AGENT_DIR/npm" "$AGENT_DIR/extensions" "$AGENT_DIR/maintenance"
cp "$ROOT/npm/package.json" "$AGENT_DIR/npm/package.json"
cp "$ROOT/npm/package-lock.json" "$AGENT_DIR/npm/package-lock.json"
npm ci --ignore-scripts --omit=dev --legacy-peer-deps --prefix "$AGENT_DIR/npm"

cp "$ROOT/configs/settings.json" "$AGENT_DIR/settings.json"
cp "$ROOT/configs/APPEND_SYSTEM.md" "$AGENT_DIR/APPEND_SYSTEM.md"
cp "$ROOT/configs/pi-fast-resume.json" "$AGENT_DIR/extensions/pi-fast-resume.json"
cp "$ROOT/configs/quotas.json" "$AGENT_DIR/extensions/quotas.json"
cp "$ROOT/local-extensions/tools.ts" "$AGENT_DIR/extensions/tools.ts"
cp "$ROOT/configs/pi-canary.json" "$AGENT_DIR/npm/node_modules/pi-canary/extensions/canary.json"

if [[ "$(realpath "$ROOT")" != "$(realpath "$AGENT_DIR/maintenance")" ]]; then
  rm -rf "$AGENT_DIR/maintenance"
  mkdir -p "$AGENT_DIR/maintenance"
  tar -C "$ROOT" --exclude=.git --exclude=backups -cf - . | tar -C "$AGENT_DIR/maintenance" -xf -
fi

if [[ "$current_version" != "$PI_VERSION" ]]; then
  core_changed=1
  npm install --global --ignore-scripts "@earendil-works/pi-coding-agent@$PI_VERSION"
  hash -r
fi
[[ "$(pi --version)" == "$PI_VERSION" ]] || { echo "FAIL Pi $PI_VERSION is not active on PATH" >&2; false; }

PI_CODING_AGENT_DIR="$AGENT_DIR" python3 "$AGENT_DIR/maintenance/scripts/maintenance.py" apply
PI_CODING_AGENT_DIR="$AGENT_DIR" python3 "$AGENT_DIR/maintenance/scripts/maintenance.py" verify

printf '%s\n' "$backup" > "$AGENT_DIR/.my-pi-last-backup"
trap - ERR
echo "PASS installed my_pi. Backup: $backup"
echo "Authenticate provider separately. Restart Pi before use."
