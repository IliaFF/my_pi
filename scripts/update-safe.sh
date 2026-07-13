#!/usr/bin/env bash
set -uo pipefail

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
BASE="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
MAINT="$BASE/scripts/maintenance.py"
LOG="$BASE/last-update.log"

if [[ "${1:-}" == "--dry-run" ]]; then
  echo "[1/2] Checking pinned patches"
  python3 "$MAINT" check || exit 1
  echo "[2/2] Verifying current installation"
  python3 "$MAINT" verify
  exit $?
fi

echo "[1/6] Verifying current installation"
python3 "$MAINT" verify || {
  echo "ABORT: current installation is not in known-good state" >&2
  exit 1
}

echo "[2/6] Creating recovery backup"
BACKUP="$(python3 "$MAINT" backup)" || exit 1
echo "Backup: $BACKUP"

echo "[3/6] Updating unpinned Pi packages"
set +e
pi update --extensions "$@" 2>&1 | tee "$LOG"
UPDATE_RC=${PIPESTATUS[0]}

echo "[4/6] Restoring managed configuration"
python3 "$MAINT" restore-configs
CONFIG_RC=$?

echo "[5/6] Reapplying local patches when needed"
python3 "$MAINT" apply
PATCH_RC=$?

echo "[6/6] Running static verification"
python3 "$MAINT" verify
VERIFY_RC=$?

if (( UPDATE_RC || CONFIG_RC || PATCH_RC || VERIFY_RC )); then
  echo "FAIL: update=$UPDATE_RC config=$CONFIG_RC patch=$PATCH_RC verify=$VERIFY_RC" >&2
  echo "Restoring recovery backup: $BACKUP" >&2
  if python3 "$MAINT" restore-backup "$BACKUP" && python3 "$MAINT" verify; then
    echo "ROLLBACK PASS: previous extension tree, configs, and patched files restored" >&2
  else
    echo "ROLLBACK FAIL: manual recovery required from $BACKUP" >&2
  fi
  echo "Log: $LOG" >&2
  exit 1
fi

echo "PASS: update completed. Restart Pi before use."
