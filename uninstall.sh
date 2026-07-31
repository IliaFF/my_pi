#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
DRY_RUN=0
BACKUP=""

usage() {
  cat <<'EOF'
Usage: ./uninstall.sh [--backup PATH] [--dry-run]

Restores agent configs, profiles, and launcher captured before installation.
Pi core stays at its current version.
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

python3 - "$state" "$AGENT_DIR" "$HOME" <<'PY'
import json, sys
from pathlib import Path
s = json.loads(Path(sys.argv[1]).read_text())
if Path(s.get("agentDir", "")).resolve() != Path(sys.argv[2]).resolve():
    raise SystemExit("FAIL backup belongs to another agent directory")
if Path(s.get("home", "")).resolve() != Path(sys.argv[3]).resolve():
    raise SystemExit("FAIL backup belongs to another home directory")
allowed_agent = {
 "settings.json", "APPEND_SYSTEM.md", "PROFILES.md", "extensions/tools.ts",
 "extensions/lean-tools.ts", "extensions/loop-profiler.ts", "extensions/context-compaction.ts",
 "extensions/auto-ultra-compact", "extensions/pi-fast-resume.json", "extensions/quotas.json",
 "npm", "maintenance",
}
profiles = ("research", "typed", "fabric", "tmux")
allowed_external = {".local/bin/pi-profile", ".pi/profiles/fabric/fabric.json"}
for p in profiles:
    allowed_external |= {f".pi/profiles/{p}/{x}" for x in ("settings.json", "APPEND_SYSTEM.md", "auth.json", "extensions", "models-store.json", "npm")}
if set(s.get("agentManaged", [])) != allowed_agent or set(s.get("externalManaged", [])) != allowed_external:
    raise SystemExit("FAIL backup contains unexpected managed paths")
PY
mapfile -t agent_managed < <(python3 -c 'import json,sys; print("\n".join(json.load(open(sys.argv[1]))["agentManaged"]))' "$state")
mapfile -t external_managed < <(python3 -c 'import json,sys; print("\n".join(json.load(open(sys.argv[1]))["externalManaged"]))' "$state")
if ((DRY_RUN)); then
  echo "DRY-RUN restore from: $BACKUP"
  printf 'DRY-RUN replace agent: %s\n' "${agent_managed[@]}"
  printf 'DRY-RUN replace home: %s\n' "${external_managed[@]}"
  echo "DRY-RUN Pi core is unchanged"
  exit 0
fi

python3 - "$BACKUP/agent-files.tar.gz" "$BACKUP/external-files.tar.gz" "$AGENT_DIR" <<'PY'
import sys, tarfile
from pathlib import Path, PurePosixPath
agent = Path(sys.argv[3]).resolve()
for raw in sys.argv[1:3]:
    try: archive = tarfile.open(raw, "r:gz")
    except FileNotFoundError: continue
    with archive:
        for member in archive.getmembers():
            p = PurePosixPath(member.name)
            if p.is_absolute() or ".." in p.parts or member.ischr() or member.isblk() or member.isfifo():
                raise SystemExit(f"FAIL unsafe backup member: {member.name}")
            if member.issym():
                link = PurePosixPath(member.linkname)
                if link.is_absolute():
                    try: Path(member.linkname).resolve().relative_to(agent)
                    except ValueError: raise SystemExit(f"FAIL unsafe backup symlink: {member.name}")
                elif ".." in link.parts:
                    raise SystemExit(f"FAIL unsafe backup symlink: {member.name}")
PY
for item in "${agent_managed[@]}"; do rm -rf "$AGENT_DIR/$item"; done
for item in "${external_managed[@]}"; do rm -rf "$HOME/$item"; done
mkdir -p "$AGENT_DIR"
[[ ! -f "$BACKUP/agent-files.tar.gz" ]] || tar -C "$AGENT_DIR" -xzf "$BACKUP/agent-files.tar.gz"
[[ ! -f "$BACKUP/external-files.tar.gz" ]] || tar -C "$HOME" -xzf "$BACKUP/external-files.tar.gz"
rm -f "$AGENT_DIR/.my-pi-last-backup"
echo "PASS restored pre-install agent files, profiles, and launcher from $BACKUP"
echo "Pi core unchanged. Restart Pi before use."
