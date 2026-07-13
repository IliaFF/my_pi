#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
DRY_RUN=0
BACKUP=""

usage() {
  cat <<'EOF'
Usage: ./uninstall.sh [--backup PATH] [--dry-run]

Restores files captured before installation. Pi core stays at current version.
Use --backup to select an older backup. Default reads ~/.pi/agent/.my-pi-last-backup.
EOF
}

while (($#)); do
  case "$1" in
    --backup) BACKUP="${2:?missing backup path}"; shift ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

if [[ -z "$BACKUP" ]]; then
  marker="$AGENT_DIR/.my-pi-last-backup"
  [[ -f "$marker" ]] || { echo "FAIL backup marker missing: $marker" >&2; exit 1; }
  BACKUP="$(cat "$marker")"
fi
state="$BACKUP/state.json"
[[ -f "$state" ]] || { echo "FAIL state missing: $state" >&2; exit 1; }

python3 - "$state" "$AGENT_DIR" <<'PY'
import json, sys
from pathlib import Path
state = json.loads(Path(sys.argv[1]).read_text())
expected = Path(sys.argv[2]).resolve()
actual = Path(state.get("agentDir", "")).resolve()
if actual != expected:
    raise SystemExit(f"FAIL backup belongs to {actual}, target is {expected}")
allowed = {"settings.json", "APPEND_SYSTEM.md", "extensions/tools.ts", "extensions/pi-fast-resume.json", "extensions/quotas.json", "npm", "maintenance"}
if not set(state.get("present", [])) <= allowed:
    raise SystemExit("FAIL backup state contains unknown managed paths")
PY

managed=("settings.json" "APPEND_SYSTEM.md" "extensions/tools.ts" "extensions/pi-fast-resume.json" "extensions/quotas.json" "npm" "maintenance")
if ((DRY_RUN)); then
  echo "DRY-RUN restore from: $BACKUP"
  printf 'DRY-RUN replace: %s\n' "${managed[@]}"
  echo "DRY-RUN Pi core is not changed"
  exit 0
fi

stage="$(mktemp -d "${TMPDIR:-/tmp}/my-pi-restore.XXXXXX")"
trap 'rm -rf "$stage"' EXIT
if [[ -f "$BACKUP/agent-files.tar.gz" ]]; then
  python3 - "$BACKUP/agent-files.tar.gz" <<'PY'
import posixpath, sys, tarfile
from pathlib import PurePosixPath
allowed = {"settings.json", "APPEND_SYSTEM.md", "extensions", "npm", "maintenance"}
with tarfile.open(sys.argv[1], "r:gz") as archive:
    for member in archive.getmembers():
        path = PurePosixPath(member.name)
        if path.is_absolute() or ".." in path.parts or not path.parts or path.parts[0] not in allowed:
            raise SystemExit(f"FAIL unsafe backup member: {member.name}")
        if member.ischr() or member.isblk() or member.isfifo():
            raise SystemExit(f"FAIL special backup member: {member.name}")
        if member.issym() or member.islnk():
            target = member.linkname if member.islnk() else str(path.parent / member.linkname)
            normalized = posixpath.normpath(target)
            if normalized == ".." or normalized.startswith("../") or normalized.startswith("/"):
                raise SystemExit(f"FAIL unsafe backup link: {member.name} -> {member.linkname}")
PY
  tar -C "$stage" -xzf "$BACKUP/agent-files.tar.gz"
fi

for item in "${managed[@]}"; do
  rm -rf "$AGENT_DIR/$item"
done
mkdir -p "$AGENT_DIR"
tar -C "$stage" -cf - . | tar -C "$AGENT_DIR" -xf -
rm -f "$AGENT_DIR/.my-pi-last-backup"
echo "PASS restored pre-install agent files from $BACKUP"
echo "Pi core unchanged. Restart Pi before use."
