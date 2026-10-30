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

python3 - "$state" "$AGENT_DIR" "$BACKUP/agent-files.tar.gz" "$DRY_RUN" <<'PY'
import hashlib
import json
import os
import posixpath
import shutil
import sys
import tarfile
import tempfile
from pathlib import Path, PurePosixPath

s = json.loads(Path(sys.argv[1]).read_text())
if Path(s["agentDir"]).resolve() != Path(sys.argv[2]).resolve():
    raise SystemExit("FAIL backup belongs to another agent directory")
allowed = {
    "settings.json", "APPEND_SYSTEM.md", "my-pi-settings.json", "fabric.json", "extensions/tools.ts", "extensions/lean-tools.ts",
    "extensions/loop-profiler.ts", "extensions/decision-observer.ts", "extensions/reader-pane.ts", "extensions/todo-queue", "extensions/project-loop.ts", "extensions/context-compaction.ts", "extensions/context-compaction.ts.disabled", "extensions/auto-ultra-compact", "extensions/output-compactor", "extensions/fabric-output",
    "extensions/pi-fast-resume.json", "extensions/quotas.json", "extensions/context-compaction.json", "extensions/output-compactor.json", "extensions/fabric-output.json", "skills/openalex", "npm", "maintenance",
}
legacy = allowed.copy()
allowed.update({"mcp.json", "train-agents/config.json",
               "extensions/jev-review", "extensions/herdr-agent-state.ts"})
previous = allowed.copy()
allowed.add("extensions/deferred-tools.ts")
deferred = allowed.copy()
allowed.add("extensions/task-session.ts")
task_session = allowed.copy()
allowed.add("herdr-agents/config.json")
herdr_config = allowed.copy()
allowed.add("AGENTS.md")
instruction_policy = allowed.copy()
allowed.update({"extensions/aitunnel.ts", "skills/cpp-styleguide/SKILL.md",
                "skills/python-styleguide/SKILL.md", "skills/latex-simple-style/SKILL.md",
                "bin/firstmate", "bin/jev-browser", "bin/paper-search-mcp"})
managed = s.get("agentManaged", [])
if not isinstance(managed, list) or set(managed) not in (legacy, previous, deferred, task_session, herdr_config, instruction_policy, allowed):
    raise SystemExit("FAIL backup contains unexpected managed paths")
present = s["agentPresent"]
if not isinstance(present, list) or not all(isinstance(name, str) and name in managed for name in present):
    raise SystemExit("FAIL backup contains unexpected present paths")
agent = Path(sys.argv[2]).resolve()
if agent.exists() and not agent.is_dir():
    raise SystemExit("FAIL agent destination is not a directory")
for item in managed:
    for parent in Path(item).parents:
        target = agent / parent
        if parent != Path(".") and (target.is_symlink() or (target.exists() and not target.is_dir())):
            raise SystemExit(f"FAIL unsafe restore parent: {item}")


def within(name, roots):
    """Restrict archive destinations and links to saved managed trees."""
    return any(name == root or name.startswith(root + "/") for root in roots)


def fingerprint(path):
    if path.is_symlink():
        return ("link", os.readlink(path))
    mode = path.stat().st_mode & 0o111
    if path.is_dir():
        return ("directory", mode)
    with path.open("rb") as stream:
        return ("file", hashlib.file_digest(stream, "sha256").hexdigest(), mode)

# Stage everything before deleting current files, including on dry-run.
with tempfile.TemporaryDirectory(prefix="pi-restore-") as temporary:
    stage = Path(temporary)
    archive_path = Path(sys.argv[3])
    if not archive_path.exists() and present:
        raise SystemExit("FAIL backup payload missing")
    if archive_path.exists():
        with tarfile.open(archive_path, "r:gz") as archive:
            for member in archive.getmembers():
                path = PurePosixPath(member.name)
                if (path.is_absolute() or ".." in path.parts
                        or not within(str(path), present)
                        or not (member.isfile() or member.isdir()
                                or member.issym() or member.islnk())):
                    raise SystemExit(
                        f"FAIL unsafe backup member: {member.name}")
                if member.issym() or member.islnk():
                    link = PurePosixPath(member.linkname)
                    target = posixpath.normpath(str(
                        path.parent / link if member.issym() else link))
                    if link.is_absolute() or not within(target, present):
                        raise SystemExit(
                            f"FAIL unsafe backup link: {member.name}")
            archive.extractall(stage, filter="data")
            while archive.fileobj.read(1024 * 1024):
                pass  # Validate the gzip trailer before touching current files.
            for member in archive.getmembers():
                if member.isdir():
                    (stage / member.name).chmod(member.mode & 0o777)
    for item in present:
        saved = stage / item
        if not saved.exists() and not saved.is_symlink():
            raise SystemExit(f"FAIL backup missing saved path: {item}")
    expected = {}
    for path in stage.rglob("*"):
        relative = path.relative_to(stage)
        if path.is_symlink():
            target = path.resolve().relative_to(stage)
            if not within(target.as_posix(), present):
                raise SystemExit(f"FAIL unmanaged backup link: {relative}")
        if within(relative.as_posix(), present):
            expected[relative] = fingerprint(path)
    if sys.argv[4] == "1":
        print(f"DRY-RUN restore from: {Path(sys.argv[1]).parent}")
        for item in managed:
            print(f"DRY-RUN replace agent: {item}")
        print("DRY-RUN Pi core is unchanged")
    else:
        agent.mkdir(parents=True, exist_ok=True)
        for item in managed:
            destination = agent / item
            if destination.is_symlink() or destination.is_file():
                destination.unlink()
            elif destination.exists():
                shutil.rmtree(destination)
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
        print(
            f"PASS restored pre-install agent files from {Path(sys.argv[1]).parent}")
        print("Pi core unchanged. Restart Pi before use.")
PY
