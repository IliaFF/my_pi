#!/usr/bin/env python3
"""Validate release structure and replay every patch on pristine npm archives."""

from __future__ import annotations

import io
import json
import re
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent).resolve()


def fail(message: str) -> None:
    raise RuntimeError(message)


def tarball(package: str, version: str) -> bytes:
    quoted = package.replace("/", "%2f")
    with urllib.request.urlopen(f"https://registry.npmjs.org/{quoted}/{version}", timeout=30) as response:
        metadata = json.load(response)
    with urllib.request.urlopen(metadata["dist"]["tarball"], timeout=60) as response:
        return response.read()


def extract_package(data: bytes, destination: Path) -> None:
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
        members = archive.getmembers()
        for member in members:
            path = Path(member.name)
            if path.is_absolute() or ".." in path.parts:
                fail(f"unsafe npm archive member: {member.name}")
        archive.extractall(destination, members=members, filter="data")


def main() -> int:
    manifest = json.loads((ROOT / "manifest.json").read_text())
    package_json = json.loads((ROOT / "npm/package.json").read_text())
    package_lock = json.loads((ROOT / "npm/package-lock.json").read_text())
    root_lock = package_lock["packages"][""]
    if package_json["dependencies"] != root_lock["dependencies"]:
        fail("package.json and package-lock.json root dependencies differ")
    for package, version in package_json["dependencies"].items():
        locked = package_lock["packages"].get(f"node_modules/{package}", {}).get("version")
        if locked != version or not re.fullmatch(r"\d+\.\d+\.\d+(?:[-+].+)?", version):
            fail(f"dependency is not exactly locked: {package} expected={version} locked={locked}")

    for item in manifest["managedConfigs"]:
        snapshot = ROOT / item["snapshot"]
        if not snapshot.is_file():
            fail(f"missing snapshot: {item['snapshot']}")
        if snapshot.suffix == ".json":
            json.loads(snapshot.read_text())

    forbidden_path = re.compile(r"(^|/)(auth\.json|sessions|recovery|mcp-cache(?:\.json)?)($|/)")
    secret_content = re.compile(r"(BEGIN [A-Z ]*PRIVATE KEY|(?:^|[^A-Za-z0-9])sk-[A-Za-z0-9_-]{16,})")
    for path in ROOT.rglob("*"):
        if ".git" in path.parts or not path.is_file():
            continue
        if forbidden_path.search(path.relative_to(ROOT).as_posix()):
            fail(f"forbidden path in release: {path.relative_to(ROOT)}")
        try:
            text = path.read_text()
        except UnicodeDecodeError:
            continue
        if secret_content.search(text):
            fail(f"possible secret in: {path.relative_to(ROOT)}")

    with tempfile.TemporaryDirectory(prefix="my-pi-test-") as temp:
        temp_path = Path(temp)
        for item in manifest["patchedPackages"]:
            destination = temp_path / re.sub(r"[^A-Za-z0-9_.-]", "_", item["package"])
            destination.mkdir()
            extract_package(tarball(item["package"], item["version"]), destination)
            root = destination / "package"
            patch = ROOT / item["patch"]
            result = subprocess.run(
                ["patch", "--batch", "--silent", "-p1", "-d", str(root)],
                stdin=patch.open(),
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
            )
            if result.returncode:
                fail(f"patch replay failed for {item['package']}: {result.stdout.strip()}")
            reverse = subprocess.run(
                ["patch", "--batch", "--silent", "--dry-run", "--reverse", "-p1", "-d", str(root)],
                stdin=patch.open(),
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
            )
            if reverse.returncode:
                fail(f"reverse patch check failed for {item['package']}: {reverse.stdout.strip()}")
            print(f"PASS patch {item['package']}@{item['version']}")

    print(f"PASS exact extension lock: {len(package_json['dependencies'])} direct, {len(package_lock['packages']) - 1} total entries")
    print("PASS release contains no known credential, session, cache, or recovery paths")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"FAIL {error}", file=sys.stderr)
        raise SystemExit(1)
