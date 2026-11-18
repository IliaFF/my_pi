#!/usr/bin/env bash
# Restores a backup made by install.sh.
set -euo pipefail

AGENT_DIR="$(realpath -m -- "${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}")"
BACKUP=""
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: ./uninstall.sh [--backup DIR] [--dry-run]

--backup DIR  Restore the specified backup (default: last installation).
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

if [[ -z "$BACKUP" && -f "$AGENT_DIR/.my-pi-last-backup" ]]; then
  BACKUP="$(<"$AGENT_DIR/.my-pi-last-backup")"
fi
if [[ -n "$BACKUP" ]]; then
  archive="$BACKUP/agent-files.tar.gz"
  [[ -f "$archive" ]] || { echo "FAIL missing $archive" >&2; exit 1; }
  managed=()
  if [[ -f "$BACKUP/managed-files" ]]; then
    [[ "$AGENT_DIR" == "$(<"$BACKUP/agent-dir")" ]] || { echo "FAIL backup belongs to a different Pi directory" >&2; exit 1; }
    mapfile -t managed < "$BACKUP/managed-files"
    for item in "${managed[@]}"; do
      case "$item" in
        settings.json|AGENTS.md|npm|extensions/providers|extensions/auto-ultra-compact|scripts/openrouter-cache-order.mjs|.my-pi-last-backup|models.json) ;;
        *) echo "FAIL unexpected backup path: $item" >&2; exit 1 ;;
      esac
    done
  fi
  if ((DRY_RUN)); then
    for item in "${managed[@]}"; do echo "DRY-RUN remove $AGENT_DIR/$item before restore"; done
    echo "DRY-RUN restore $archive into $AGENT_DIR"
    tar -tzf "$archive" | sed 's/^/DRY-RUN   /'
    exit 0
  fi
  for dir in extensions scripts; do
    if [[ -L "$AGENT_DIR/$dir" ]]; then
      echo "FAIL refusing to restore through a symlink: $AGENT_DIR/$dir" >&2
      exit 1
    fi
  done
  if [[ -f "$BACKUP/systemd-dir" ]]; then
    systemd_dir="$(<"$BACKUP/systemd-dir")"
    if [[ -f "$systemd_dir/openrouter-cache-order.timer" ]]; then
      systemctl --user disable --now openrouter-cache-order.timer
      systemctl --user stop openrouter-cache-order.service
    fi
    rm -f -- "$systemd_dir"/openrouter-cache-order.{service,timer}
    systemctl --user daemon-reload
  fi
  mkdir -p "$AGENT_DIR"
  for item in "${managed[@]}"; do rm -rf -- "$AGENT_DIR/$item"; done
  tar -C "$AGENT_DIR" -xzf "$archive"
  echo "PASS restored $archive into $AGENT_DIR"
  exit 0
fi

echo "FAIL no installation backup found; pass --backup DIR" >&2
exit 1
