#!/usr/bin/env python3
"""Verify rollback on disposable Pi directories."""

import io
import os
import pathlib
import subprocess
import tarfile
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent


def _restore(agent, backup):
    return subprocess.run(
        ["bash", str(ROOT / "uninstall.sh"), "--backup", str(backup)],
        env={**os.environ, "PI_CODING_AGENT_DIR": str(agent)},
        capture_output=True, text=True, timeout=20,
    )


def _check_rollback(directory):
    agent, backup = directory / "agent", directory / "backup"
    agent.mkdir()
    backup.mkdir()
    settings = agent / "settings.json"
    settings.write_bytes(b"current\n")
    (agent / "private.txt").write_bytes(b"untouched\n")
    (agent / "npm").mkdir()
    (agent / "npm/new").touch()
    (backup / "agent-dir").write_text(f"{agent}\n")
    (backup / "managed-files").write_text("settings.json\nnpm\n")
    path = backup / "agent-files.tar.gz"
    path.write_bytes(b"not a tar archive")
    result = _restore(agent, backup)
    assert result.returncode != 0, result.stdout + result.stderr
    assert settings.read_bytes() == b"current\n"
    assert (agent / "npm/new").is_file()

    with tarfile.open(path, "w:gz") as snapshot:
        for name in ("settings.json", "npm/node_modules/pkg/cli", "private.txt"):
            member = tarfile.TarInfo(name)
            member.mode = 0o755
            data = b"original\n"
            member.size = len(data)
            snapshot.addfile(member, io.BytesIO(data))
        link = tarfile.TarInfo("npm/node_modules/.bin/cli")
        link.type = tarfile.SYMTYPE
        link.linkname = "../pkg/cli"
        snapshot.addfile(link)
    result = _restore(agent, backup)
    assert result.returncode == 0, result.stdout + result.stderr
    assert settings.read_bytes() == b"original\n"
    assert (agent / "private.txt").read_bytes() == b"untouched\n"
    assert not (agent / "npm/new").exists()
    installed = agent / link.name
    assert installed.is_symlink() and installed.readlink() == pathlib.Path(link.linkname)
    assert installed.read_bytes() == b"original\n" and os.access(installed, os.X_OK)


if __name__ == "__main__":
    with tempfile.TemporaryDirectory(prefix="pi-rollback-") as temp:
        _check_rollback(pathlib.Path(temp))
    print("PASS rollback: invalid archive untouched, npm link restored, unmanaged file preserved")
