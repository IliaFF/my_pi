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
  # Check and unpack the entire snapshot before touching the active installation.
  stage="$(mktemp -d)"
  swap=""
  switching=0
  cleanup() {
    rm -rf -- "$stage"
    if [[ -n "$swap" ]]; then
      if ((switching)); then
        echo "FAIL restore interrupted; previous files retained in $swap/previous" >&2
      else
        rm -rf -- "$swap"
      fi
    fi
  }
  trap cleanup EXIT
  tar -C "$stage" -xzf "$archive"
  for dir in extensions scripts; do
    [[ ! -L "$stage/$dir" ]] || { echo "FAIL snapshot contains a symlink parent: $dir" >&2; exit 1; }
  done
  if [[ ! -f "$BACKUP/managed-files" ]]; then
    for item in settings.json AGENTS.md npm; do
      if [[ -e "$stage/$item" || -L "$stage/$item" ]]; then managed+=("$item"); fi
    done
  fi
  # Prepare all replacements on the destination filesystem before changing live files.
  mkdir -p -- "$AGENT_DIR"
  swap="$(mktemp -d "$AGENT_DIR/.restore.XXXXXXXX")"
  for item in "${managed[@]}"; do
    mkdir -p -- "$(dirname -- "$swap/previous/$item")"
    if [[ -e "$stage/$item" || -L "$stage/$item" ]]; then
      mkdir -p -- "$(dirname -- "$swap/next/$item")" "$(dirname -- "$AGENT_DIR/$item")"
      cp -a -- "$stage/$item" "$swap/next/$item"
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
  switching=1
  for item in "${managed[@]}"; do
    if [[ -e "$AGENT_DIR/$item" || -L "$AGENT_DIR/$item" ]]; then
      mv -T -- "$AGENT_DIR/$item" "$swap/previous/$item"
    fi
    if [[ -e "$swap/next/$item" || -L "$swap/next/$item" ]]; then
      mv -T -- "$swap/next/$item" "$AGENT_DIR/$item"
    fi
  done
  switching=0
  echo "PASS restored $archive into $AGENT_DIR"
  exit 0
fi

echo "FAIL no installation backup found; pass --backup DIR" >&2
exit 1
