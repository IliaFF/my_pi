#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
DRY_RUN=0
BACKUP=""

usage() {
  cat <<'EOF'
Usage: ./uninstall.sh [--backup PATH] [--dry-run]

Restores managed agent files captured before installation. Pi core stays unchanged.
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
s = json.loads(Path(sys.argv[1]).read_text())
if Path(s.get("agentDir", "")).resolve() != Path(sys.argv[2]).resolve():
    raise SystemExit("FAIL backup belongs to another agent directory")
allowed = {
 "settings.json", "APPEND_SYSTEM.md", "fabric.json", "extensions/tools.ts", "extensions/lean-tools.ts",
 "extensions/loop-profiler.ts", "extensions/project-loop.ts", "extensions/context-compaction.ts", "extensions/auto-ultra-compact",
 "extensions/pi-fast-resume.json", "extensions/quotas.json", "npm", "maintenance",
}
if set(s.get("agentManaged", [])) != allowed:
    raise SystemExit("FAIL backup contains unexpected managed paths")
PY
mapfile -t managed < <(python3 -c 'import json,sys; sys.stdout.write("\n".join(json.load(open(sys.argv[1]))["agentManaged"]))' "$state")
if ((DRY_RUN)); then
  echo "DRY-RUN restore from: $BACKUP"
  printf 'DRY-RUN replace agent: %s\n' "${managed[@]}"
  echo "DRY-RUN Pi core is unchanged"
  exit 0
fi

python3 - "$BACKUP/agent-files.tar.gz" <<'PY'
import sys, tarfile
from pathlib import PurePosixPath
try: archive = tarfile.open(sys.argv[1], "r:gz")
except FileNotFoundError: raise SystemExit(0)
with archive:
    for member in archive.getmembers():
        p = PurePosixPath(member.name)
        if p.is_absolute() or ".." in p.parts or member.ischr() or member.isblk() or member.isfifo():
            raise SystemExit(f"FAIL unsafe backup member: {member.name}")
        if member.issym() and (member.linkname.startswith("/") or ".." in PurePosixPath(member.linkname).parts):
            raise SystemExit(f"FAIL unsafe backup symlink: {member.name}")
PY
for item in "${managed[@]}"; do rm -rf "$AGENT_DIR/$item"; done
mkdir -p "$AGENT_DIR"
[[ ! -f "$BACKUP/agent-files.tar.gz" ]] || tar -C "$AGENT_DIR" -xzf "$BACKUP/agent-files.tar.gz"
rm -f "$AGENT_DIR/.my-pi-last-backup"
echo "PASS restored pre-install agent files from $BACKUP"
echo "Pi core unchanged. Restart Pi before use."
