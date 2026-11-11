#!/usr/bin/env bash
# Removes the clean-Pi installation or restores a backup made by install.sh.
set -euo pipefail

AGENT_DIR="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
BACKUP=""
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: ./uninstall.sh [--backup DIR] [--dry-run]

--backup DIR  Restore the agent files archived by install.sh from DIR.
--dry-run     Print planned removals/restores without changing the host.
EOF
}

while (($#)); do
  case "$1" in
    --backup) BACKUP="${2:?--backup needs a directory}"; shift ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

if [[ -n "$BACKUP" ]]; then
  archive="$BACKUP/agent-files.tar.gz"
  [[ -f "$archive" ]] || { echo "FAIL missing $archive" >&2; exit 1; }
  if ((DRY_RUN)); then
    echo "DRY-RUN restore $archive into $AGENT_DIR"
    tar -tzf "$archive" | sed 's/^/DRY-RUN   /'
    exit 0
  fi
  mkdir -p "$AGENT_DIR"
  tar -C "$AGENT_DIR" -xzf "$archive"
  echo "PASS restored $archive into $AGENT_DIR"
  exit 0
fi

for item in settings.json AGENTS.md npm .my-pi-last-backup; do
  target="$AGENT_DIR/$item"
  if ((DRY_RUN)); then
    [[ -e "$target" ]] && echo "DRY-RUN remove $target"
    continue
  fi
  rm -rf "$target"
done
if ((!DRY_RUN)); then echo "PASS removed clean-Pi files from $AGENT_DIR"; fi
