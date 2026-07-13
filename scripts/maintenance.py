#!/usr/bin/env python3
"""Versioned maintenance for locally patched Pi extensions."""

from __future__ import annotations

import argparse
import datetime as dt
import difflib
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import urllib.request

BASE = Path(__file__).resolve().parent.parent
MANIFEST_PATH = BASE / "manifest.json"
AGENT_DIR = Path(os.environ.get("PI_CODING_AGENT_DIR", Path.home() / ".pi" / "agent")).expanduser()
NPM_ROOT = AGENT_DIR / "npm" / "node_modules"


def load_manifest() -> dict:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def package_root(item: dict) -> Path:
    if item.get("location") == "pi-core":
        override = os.environ.get("PI_CODING_AGENT_CORE_DIR")
        if override:
            return Path(override).expanduser().resolve()
        executable = shutil.which("pi")
        if not executable:
            raise RuntimeError("cannot locate pi executable")
        return Path(executable).resolve().parent.parent
    return NPM_ROOT / item["package"]


def installed_version(item: dict) -> str | None:
    path = package_root(item) / "package.json"
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))["version"]


def registry_tarball(package: str, version: str) -> bytes:
    quoted = package.replace("/", "%2f")
    with urllib.request.urlopen(f"https://registry.npmjs.org/{quoted}/{version}", timeout=30) as r:
        metadata = json.load(r)
    with urllib.request.urlopen(metadata["dist"]["tarball"], timeout=60) as r:
        return r.read()


def pristine_files(item: dict) -> dict[str, bytes]:
    data = registry_tarball(item["package"], item["version"])
    result: dict[str, bytes] = {}
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tf:
        for member in tf.getmembers():
            if not member.isfile():
                continue
            rel = member.name.removeprefix("package/")
            if rel in item["files"]:
                extracted = tf.extractfile(member)
                if extracted is not None:
                    result[rel] = extracted.read()
    return result


def run_patch(root: Path, patch_file: Path, *, reverse: bool, dry_run: bool) -> subprocess.CompletedProcess[str]:
    args = ["patch", "--batch", "--silent", "-p1", "-d", str(root)]
    if reverse:
        args.append("--reverse")
    if dry_run:
        args.append("--dry-run")
    with patch_file.open("r", encoding="utf-8") as f:
        return subprocess.run(args, stdin=f, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)


def patch_state(item: dict) -> str:
    root = package_root(item)
    patch_file = BASE / item["patch"]
    if not root.is_dir():
        return "package-missing"
    if installed_version(item) != item["version"]:
        return "version-mismatch"
    if not patch_file.is_file():
        return "patch-missing"
    if run_patch(root, patch_file, reverse=True, dry_run=True).returncode == 0:
        return "applied"
    if run_patch(root, patch_file, reverse=False, dry_run=True).returncode == 0:
        return "pending"
    return "conflict"


def capture() -> int:
    manifest = load_manifest()
    failures = 0
    for item in manifest["patchedPackages"]:
        current_version = installed_version(item)
        if current_version != item["version"]:
            print(f"FAIL {item['package']}: installed={current_version}, expected={item['version']}")
            failures += 1
            continue
        pristine = pristine_files(item)
        chunks: list[str] = []
        for rel in item["files"]:
            current_path = package_root(item) / rel
            if rel not in pristine or not current_path.is_file():
                print(f"FAIL {item['package']}: cannot capture {rel}")
                failures += 1
                continue
            before = pristine[rel].decode("utf-8").splitlines(keepends=True)
            after = current_path.read_text(encoding="utf-8").splitlines(keepends=True)
            chunks.extend(difflib.unified_diff(before, after, fromfile=f"a/{rel}", tofile=f"b/{rel}", n=3))
        patch_file = BASE / item["patch"]
        patch_file.parent.mkdir(parents=True, exist_ok=True)
        patch_file.write_text("".join(chunks), encoding="utf-8")
        if patch_file.stat().st_size == 0:
            print(f"FAIL {item['package']}: generated patch is empty")
            failures += 1
        else:
            print(f"CAPTURED {item['package']} -> {patch_file.relative_to(BASE)}")
    return 1 if failures else 0


def snapshot() -> int:
    failures = 0
    for item in load_manifest()["managedConfigs"]:
        source = AGENT_DIR / item["source"]
        target = BASE / item["snapshot"]
        if not source.is_file():
            print(f"FAIL missing config: {source}")
            failures += 1
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        print(f"SNAPSHOT {source} -> {target.relative_to(BASE)}")
    return 1 if failures else 0


def backup() -> int:
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    target = BASE / "backups" / stamp
    target.mkdir(parents=True, mode=0o700)
    metadata: dict[str, object] = {"created": stamp, "agentDir": str(AGENT_DIR), "files": []}
    paths: set[Path] = {
        AGENT_DIR / "settings.json",
        AGENT_DIR / "npm" / "package.json",
        AGENT_DIR / "npm" / "package-lock.json",
    }
    manifest = load_manifest()
    for item in manifest["managedConfigs"]:
        paths.add(AGENT_DIR / item["source"])
    for item in manifest["patchedPackages"]:
        root = package_root(item)
        paths.add(root / "package.json")
        for rel in item["files"]:
            paths.add(root / rel)
    for source in sorted(paths):
        if not source.is_file():
            continue
        try:
            rel = source.relative_to(AGENT_DIR)
        except ValueError:
            rel = Path("external") / source.name
        destination = target / rel
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        metadata["files"].append({"path": str(source), "sha256": sha256(source)})
    npm_dir = AGENT_DIR / "npm"
    if npm_dir.is_dir():
        npm_archive = target / "npm-tree.tar.gz"
        with tarfile.open(npm_archive, "w:gz") as archive:
            archive.add(npm_dir, arcname="npm", recursive=True)
        metadata["npmArchiveSha256"] = sha256(npm_archive)
    (target / "backup-manifest.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(target)
    return 0


def restore_backup(path_string: str | None) -> int:
    if not path_string:
        print("FAIL restore-backup requires a backup path", file=sys.stderr)
        return 1
    backup_dir = Path(path_string).expanduser().resolve()
    metadata_path = backup_dir / "backup-manifest.json"
    if not metadata_path.is_file():
        print(f"FAIL missing backup manifest: {metadata_path}", file=sys.stderr)
        return 1
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if Path(metadata.get("agentDir", "")).expanduser().resolve() != AGENT_DIR.resolve():
        print("FAIL backup belongs to a different agent directory", file=sys.stderr)
        return 1

    allowed: set[Path] = {
        AGENT_DIR / "settings.json",
        AGENT_DIR / "npm" / "package.json",
        AGENT_DIR / "npm" / "package-lock.json",
    }
    manifest = load_manifest()
    for item in manifest["managedConfigs"]:
        allowed.add(AGENT_DIR / item["source"])
    for item in manifest["patchedPackages"]:
        root = package_root(item)
        allowed.add(root / "package.json")
        for rel in item["files"]:
            allowed.add(root / rel)

    staged: list[tuple[Path, Path]] = []
    for entry in metadata.get("files", []):
        destination = Path(entry.get("path", "")).expanduser().resolve()
        if destination not in {path.resolve() for path in allowed}:
            print(f"FAIL backup contains unmanaged destination: {destination}", file=sys.stderr)
            return 1
        try:
            rel = destination.relative_to(AGENT_DIR.resolve())
        except ValueError:
            rel = Path("external") / destination.name
        source = backup_dir / rel
        if not source.is_file() or sha256(source) != entry.get("sha256"):
            print(f"FAIL invalid backup payload: {source}", file=sys.stderr)
            return 1
        staged.append((source, destination))

    npm_stage: Path | None = None
    npm_archive = backup_dir / "npm-tree.tar.gz"
    expected_npm_hash = metadata.get("npmArchiveSha256")
    if expected_npm_hash:
        if not npm_archive.is_file() or sha256(npm_archive) != expected_npm_hash:
            print(f"FAIL invalid npm backup archive: {npm_archive}", file=sys.stderr)
            return 1
        npm_stage = Path(tempfile.mkdtemp(prefix="pi-maintenance-restore-"))
        try:
            with tarfile.open(npm_archive, "r:gz") as archive:
                archive.extractall(npm_stage, filter="data")
        except Exception as exc:
            shutil.rmtree(npm_stage, ignore_errors=True)
            print(f"FAIL cannot extract npm backup: {exc}", file=sys.stderr)
            return 1
        if not (npm_stage / "npm").is_dir():
            shutil.rmtree(npm_stage, ignore_errors=True)
            print("FAIL npm backup has no npm directory", file=sys.stderr)
            return 1

    if npm_stage is not None:
        shutil.rmtree(AGENT_DIR / "npm", ignore_errors=True)
        shutil.move(str(npm_stage / "npm"), str(AGENT_DIR / "npm"))
        shutil.rmtree(npm_stage, ignore_errors=True)
        print(f"RESTORED {AGENT_DIR / 'npm'}")

    for source, destination in staged:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        print(f"RESTORED {destination}")
    return 0


def restore_configs() -> int:
    failures = 0
    for item in load_manifest()["managedConfigs"]:
        if not item.get("restore"):
            continue
        source = BASE / item["snapshot"]
        target = AGENT_DIR / item["source"]
        if not source.is_file():
            print(f"FAIL missing snapshot: {source}")
            failures += 1
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.is_file() and sha256(source) == sha256(target):
            print(f"UNCHANGED {target}")
            continue
        shutil.copy2(source, target)
        print(f"RESTORED {target}")
    return 1 if failures else 0


def verify() -> int:
    manifest = load_manifest()
    failures = 0
    warnings = 0
    settings_path = AGENT_DIR / "settings.json"
    try:
        settings = json.loads(settings_path.read_text(encoding="utf-8"))
        specs = {x if isinstance(x, str) else x.get("source") for x in settings.get("packages", [])}
    except Exception as exc:
        print(f"FAIL settings: {exc}")
        return 1
    for item in manifest["patchedPackages"]:
        state = patch_state(item)
        pin_required = item.get("pinRequired", True)
        pinned = not pin_required or item.get("settingsSpec") in specs
        label = f"{item['package']}@{item['version']}"
        if state == "applied" and pinned:
            pin_note = "package pinned" if pin_required else "core version matched"
            print(f"PASS {label}: patch applied, {pin_note}")
        else:
            print(f"FAIL {label}: patch={state}, pinned={pinned}")
            failures += 1
    for item in manifest["managedConfigs"]:
        live = AGENT_DIR / item["source"]
        saved = BASE / item["snapshot"]
        same = live.is_file() and saved.is_file() and sha256(live) == sha256(saved)
        if same:
            print(f"PASS config {item['source']}")
        elif item.get("restore"):
            print(f"FAIL managed config drift: {item['source']}")
            failures += 1
        else:
            print(f"WARN audit snapshot drift: {item['source']} (run snapshot after review)")
            warnings += 1
    print(f"SUMMARY failures={failures} warnings={warnings}")
    return 1 if failures else 0


def apply() -> int:
    failures = 0
    for item in load_manifest()["patchedPackages"]:
        state = patch_state(item)
        label = f"{item['package']}@{item['version']}"
        if state == "applied":
            print(f"UNCHANGED {label}")
            continue
        if state != "pending":
            print(f"FAIL {label}: {state}")
            failures += 1
            continue
        result = run_patch(package_root(item), BASE / item["patch"], reverse=False, dry_run=False)
        if result.returncode:
            print(f"FAIL {label}: {result.stdout.strip()}")
            failures += 1
        else:
            print(f"APPLIED {label}")
    return 1 if failures else 0


def check() -> int:
    failures = 0
    for item in load_manifest()["patchedPackages"]:
        state = patch_state(item)
        print(f"{state.upper():16} {item['package']}@{item['version']}")
        if state not in {"applied", "pending"}:
            failures += 1
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["capture", "snapshot", "backup", "restore-backup", "restore-configs", "check", "apply", "verify"])
    parser.add_argument("path", nargs="?")
    args = parser.parse_args()
    if args.command == "restore-backup":
        return restore_backup(args.path)
    commands = {
        "capture": capture,
        "snapshot": snapshot,
        "backup": backup,
        "restore-configs": restore_configs,
        "check": check,
        "apply": apply,
        "verify": verify,
    }
    return commands[args.command]()


if __name__ == "__main__":
    raise SystemExit(main())
