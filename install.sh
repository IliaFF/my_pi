#!/usr/bin/env bash
set -euo pipefail

PI_VERSION="0.84.2"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
BACKUP_ROOT="${PI_BACKUP_DIR:-$HOME/.pi/my-pi-backups}"
CONTEXT_SETTINGS="$AGENT_DIR/my-pi-settings.json"
INSTALL_CORE=0
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: ./install.sh [--install-core] [--dry-run]

--install-core  Install exact global Pi core when missing or mismatched.
--dry-run       Validate release and print planned changes without modifying host.

Environment:
  PI_CODING_AGENT_DIR  Main agent directory. Default: ~/.pi/agent
  PI_BACKUP_DIR        Rollback backup directory. Default: ~/.pi/my-pi-backups
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
node -e 'const [M]=process.versions.node.split(".").map(Number); if (M<24) process.exit(1)' || {
  echo "FAIL Node $(node --version). Required >=24.0.0" >&2; exit 1;
}
python3 "$ROOT/scripts/test-release.py" "$ROOT"

current_version=""
if command -v pi >/dev/null 2>&1; then current_version="$(pi --version 2>/dev/null || true)"; fi
if ((DRY_RUN)); then
  echo "DRY-RUN agent: $AGENT_DIR"
  echo "DRY-RUN Pi core: ${current_version:-missing} -> $PI_VERSION (install=$INSTALL_CORE)"
  echo "DRY-RUN extensions: npm ci from exact package-lock.json, with @spences10/pi-context@0.1.16 and without Fabric/output-compactor"
  echo "DRY-RUN configs: one default profile + balanced searchable-context policy + seven local extensions"
  echo "DRY-RUN patches: 3 exact-version patches"
  exit 0
fi
if [[ "$current_version" != "$PI_VERSION" ]] && ((!INSTALL_CORE)); then
  echo "FAIL Pi core is '${current_version:-missing}', expected '$PI_VERSION'. Rerun with --install-core." >&2
  exit 1
fi

managed=(
  "settings.json" "APPEND_SYSTEM.md" "my-pi-settings.json" "fabric.json"
  "extensions/tools.ts" "extensions/lean-tools.ts" "extensions/loop-profiler.ts"
  "extensions/decision-observer.ts" "extensions/reader-pane.ts" "extensions/todo-queue" "extensions/project-loop.ts"
  "extensions/context-compaction.ts" "extensions/auto-ultra-compact" "extensions/output-compactor" "extensions/fabric-output"
  "extensions/pi-fast-resume.json" "extensions/quotas.json" "extensions/context-compaction.json" "extensions/output-compactor.json" "extensions/fabric-output.json"
  "npm" "maintenance"
)
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_ROOT"
backup="$(mktemp -d "$BACKUP_ROOT/${stamp}.XXXXXX")"
state="$backup/state.json"
python3 - "$AGENT_DIR" "$backup" "$current_version" "${managed[*]}" <<'PY'
import json, sys
from pathlib import Path
agent = Path(sys.argv[1]).expanduser().resolve()
backup = Path(sys.argv[2]).resolve()
items = sys.argv[4].split()
state = {
    "agentDir": str(agent), "oldCoreVersion": sys.argv[3],
    "agentPresent": [x for x in items if (agent / x).exists() or (agent / x).is_symlink()],
    "agentManaged": items,
}
(backup / "state.json").write_text(json.dumps(state, indent=2) + "\n")
PY
mapfile -t present < <(python3 -c 'import json,sys; sys.stdout.write("\n".join(json.load(open(sys.argv[1]))["agentPresent"]))' "$state")
if ((${#present[@]})); then tar -C "$AGENT_DIR" -czf "$backup/agent-files.tar.gz" -- "${present[@]}"; fi

core_changed=0
rollback_install() {
  local rc="$?"; trap - ERR; set +e
  echo "FAIL install interrupted. Restoring backup: $backup" >&2
  for item in "${managed[@]}"; do rm -rf "$AGENT_DIR/$item"; done
  [[ ! -f "$backup/agent-files.tar.gz" ]] || tar -C "$AGENT_DIR" -xzf "$backup/agent-files.tar.gz"
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

mkdir -p "$AGENT_DIR/npm" "$AGENT_DIR/extensions/auto-ultra-compact" "$AGENT_DIR/extensions/todo-queue" "$AGENT_DIR/maintenance"
rm -f "$AGENT_DIR/fabric.json" "$AGENT_DIR/extensions/fabric-output.json" "$AGENT_DIR/extensions/output-compactor.json"
rm -rf "$AGENT_DIR/extensions/fabric-output" "$AGENT_DIR/extensions/output-compactor"
cp "$ROOT/npm/package.json" "$AGENT_DIR/npm/package.json"
cp "$ROOT/npm/package-lock.json" "$AGENT_DIR/npm/package-lock.json"
npm ci --ignore-scripts --omit=dev --legacy-peer-deps --prefix "$AGENT_DIR/npm"
probe_dir="$backup/pi-context-runtime-probe"
mkdir -m 700 "$probe_dir"
node "$ROOT/scripts/test-pi-context-runtime.mjs" "$AGENT_DIR/npm/node_modules/@spences10/pi-context" "$probe_dir"
rm -rf "$probe_dir"

cp "$ROOT/configs/settings.json" "$AGENT_DIR/settings.json"
python3 - "$CONTEXT_SETTINGS" "$ROOT/configs/pi-context.json" <<'PY'
import json, os, sys
from pathlib import Path
path, policy_path = map(Path, sys.argv[1:])
settings = json.loads(path.read_text()) if path.exists() else {"version": 1, "extensions": {"enabled": {}}, "trust": {}, "packages": {}}
if not isinstance(settings, dict) or not isinstance(settings.get("packages", {}), dict):
    raise SystemExit(f"FAIL invalid my-pi settings: {path}")
settings["version"] = 1
settings["packages"] = {**settings.get("packages", {}), "context": json.loads(policy_path.read_text())}
path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
tmp = path.with_name(path.name + f".tmp-{os.getpid()}")
tmp.write_text(json.dumps(settings, indent="\t") + "\n")
os.chmod(tmp, 0o600)
tmp.replace(path)
PY
cp "$ROOT/configs/APPEND_SYSTEM.md" "$AGENT_DIR/APPEND_SYSTEM.md"
cp "$ROOT/configs/pi-fast-resume.json" "$AGENT_DIR/extensions/pi-fast-resume.json"
cp "$ROOT/configs/quotas.json" "$AGENT_DIR/extensions/quotas.json"
cp "$ROOT/configs/context-compaction.json" "$AGENT_DIR/extensions/context-compaction.json"
cp "$ROOT/local-extensions/tools.ts" "$AGENT_DIR/extensions/tools.ts"
rm -f "$AGENT_DIR/extensions/lean-tools.ts"
cp "$ROOT/local-extensions/loop-profiler.ts" "$AGENT_DIR/extensions/loop-profiler.ts"
cp "$ROOT/local-extensions/decision-observer.ts" "$AGENT_DIR/extensions/decision-observer.ts"
cp "$ROOT/local-extensions/reader-pane.ts" "$AGENT_DIR/extensions/reader-pane.ts"
cp "$ROOT/local-extensions/todo-queue/"{README.md,index.ts,core.ts,store.ts} "$AGENT_DIR/extensions/todo-queue/"
rm -f "$AGENT_DIR/extensions/project-loop.ts"
cp "$ROOT/local-extensions/context-compaction.ts" "$AGENT_DIR/extensions/context-compaction.ts"
cp "$ROOT/local-extensions/auto-ultra-compact/index.ts" "$AGENT_DIR/extensions/auto-ultra-compact/index.ts"
cp "$ROOT/configs/pi-canary.json" "$AGENT_DIR/npm/node_modules/pi-canary/extensions/canary.json"

rm -rf "$AGENT_DIR/maintenance"
mkdir -p "$AGENT_DIR/maintenance"
tar -C "$ROOT" --exclude=.git --exclude=backups --exclude=npm/node_modules --exclude='*/__pycache__' -cf - . | tar -C "$AGENT_DIR/maintenance" -xf -

if [[ "$current_version" != "$PI_VERSION" ]]; then
  core_changed=1
  npm install --global --ignore-scripts "@earendil-works/pi-coding-agent@$PI_VERSION"
  hash -r
fi
[[ "$(pi --version)" == "$PI_VERSION" ]] || { echo "FAIL Pi $PI_VERSION is not active on PATH" >&2; false; }
PI_CODING_AGENT_DIR="$AGENT_DIR" python3 "$AGENT_DIR/maintenance/scripts/maintenance.py" apply
PI_CODING_AGENT_DIR="$AGENT_DIR" python3 "$AGENT_DIR/maintenance/scripts/maintenance.py" verify
# Pre-create the sidecar privately: upstream otherwise creates it as 0644 under a common umask.
touch "$AGENT_DIR/context.db"
chmod 600 "$AGENT_DIR/context.db" "$AGENT_DIR"/context.db-wal "$AGENT_DIR"/context.db-shm 2>/dev/null || chmod 600 "$AGENT_DIR/context.db"
printf '%s\n' "$backup" > "$AGENT_DIR/.my-pi-last-backup"
trap - ERR
echo "PASS installed my_pi. Backup: $backup"
echo "Authenticate provider separately. Restart Pi before use."
