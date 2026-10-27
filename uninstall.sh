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

python3 - "$state" "$AGENT_DIR" "$BACKUP" "$DRY_RUN" <<'PY'
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import sys
import tarfile
import tempfile

state, agent_arg, backup_arg, dry_run = sys.argv[1:]
s = json.loads(Path(state).read_text())
agent, backup = Path(agent_arg).resolve(), Path(backup_arg).resolve()
if Path(s.get("agentDir", "")).resolve() != agent:
    raise SystemExit("FAIL backup belongs to another agent directory")
allowed = {
 "settings.json", "APPEND_SYSTEM.md", "my-pi-settings.json", "fabric.json", "extensions/tools.ts", "extensions/lean-tools.ts",
 "extensions/loop-profiler.ts", "extensions/decision-observer.ts", "extensions/reader-pane.ts", "extensions/todo-queue", "extensions/project-loop.ts", "extensions/context-compaction.ts", "extensions/context-compaction.ts.disabled", "extensions/auto-ultra-compact", "extensions/output-compactor", "extensions/fabric-output",
 "extensions/pi-fast-resume.json", "extensions/quotas.json", "extensions/context-compaction.json", "extensions/output-compactor.json", "extensions/fabric-output.json", "skills/openalex", "npm", "maintenance",
}
legacy = allowed.copy()
allowed.update({"mcp.json", "train-agents/config.json", "extensions/jev-review", "extensions/herdr-agent-state.ts"})
previous = allowed.copy()
allowed.add("extensions/deferred-tools.ts")
managed = s.get("agentManaged", [])
if not isinstance(managed, list) or set(managed) not in (legacy, previous, allowed):
    raise SystemExit("FAIL backup contains unexpected managed paths")
if dry_run == "1":
    print(f"DRY-RUN restore from: {backup}")
    for name in managed:
        print(f"DRY-RUN replace agent: {name}")
    print("DRY-RUN Pi core is unchanged")
    raise SystemExit(0)

present = s.get("agentPresent")
if not isinstance(present, list) or not all(isinstance(name, str) and name in managed for name in present):
    raise SystemExit("FAIL backup contains unexpected present paths")
owned = [PurePosixPath(name) for name in managed]
backed = [PurePosixPath(name) for name in present]
def permitted(path, roots, directory=False):
    return any(path == base or base in path.parents or (directory and path in base.parents) for base in roots)

def fingerprint(path):
    if path.is_symlink():
        return ("link", os.readlink(path))
    mode = path.stat().st_mode & 0o111
    if path.is_dir():
        return ("directory", mode)
    with path.open("rb") as stream:
        return ("file", hashlib.file_digest(stream, "sha256").hexdigest(), mode)

try:
    with tempfile.TemporaryDirectory(prefix="pi-install-restore-") as temp:
        stage = Path(temp)
        with tarfile.open(backup / "agent-files.tar.gz", "r:gz") as archive:
            for member in archive.getmembers():
                path = PurePosixPath(member.name)
                if path.is_absolute() or ".." in path.parts or not permitted(path, backed, member.isdir()):
                    raise ValueError(f"unsafe backup member: {member.name}")
                if not (member.isfile() or member.isdir() or member.issym() or member.islnk()):
                    raise ValueError(f"unsafe backup type: {member.name}")
            archive.extractall(stage, filter="data")
            while archive.fileobj.read(1024 * 1024):
                pass  # Read the gzip trailer too, before touching the agent.
            for member in archive.getmembers():
                if member.isdir():
                    (stage / member.name).chmod(member.mode & 0o777)
        for name in present:
            if not (stage / name).exists() and not (stage / name).is_symlink():
                raise ValueError(f"backup is missing expected path: {name}")
        expected = {}
        for path in stage.rglob("*"):
            relative = path.relative_to(stage)
            if not permitted(PurePosixPath(relative.as_posix()), backed, path.is_dir() and not path.is_symlink()):
                raise ValueError(f"unmanaged backup path: {relative}")
            if path.is_symlink():
                target = path.resolve().relative_to(stage)
                if not permitted(PurePosixPath(target.as_posix()), owned):
                    raise ValueError(f"unmanaged backup link: {relative}")
            if permitted(PurePosixPath(relative.as_posix()), owned):
                expected[relative] = fingerprint(path)
        # Existing destination parents must not redirect writes through symlinks.
        if agent.exists() and not agent.is_dir():
            raise ValueError("agent destination is not a directory")
        for name in managed:
            destination = agent / name
            for parent in destination.relative_to(agent).parents:
                target = agent / parent
                if parent != Path(".") and (target.is_symlink() or (target.exists() and not target.is_dir())):
                    raise ValueError(f"unsafe destination parent: {parent}")
        for name in managed:
            path = agent / name
            if path.is_symlink() or path.is_file():
                path.unlink()
            elif path.exists():
                shutil.rmtree(path)
        agent.mkdir(parents=True, exist_ok=True)
        copied = {}
        def copy_file(source, destination):
            stat = Path(source).stat()
            key = (stat.st_dev, stat.st_ino)
            if key in copied:
                os.link(copied[key], destination)
            else:
                shutil.copy2(source, destination)
                copied[key] = destination
        for name in present:
            source, destination = stage / name, agent / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            if source.is_symlink():
                destination.symlink_to(os.readlink(source))
            elif source.is_dir():
                shutil.copytree(source, destination, symlinks=True, copy_function=copy_file)
            else:
                copy_file(source, destination)
        for relative, before in expected.items():
            if fingerprint(agent / relative) != before:
                raise ValueError(f"restored content differs: {relative}")
        (agent / ".my-pi-last-backup").unlink(missing_ok=True)
except Exception as error:
    raise SystemExit(f"FAIL restore not confirmed; backup retained at {backup}: {error}")
print(f"PASS restored pre-install agent files from {backup}")
print("Pi core unchanged. Restart Pi before use.")
PY
