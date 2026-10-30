#!/usr/bin/env python3
"""Exercise real installer rollback against temporary, untrusted archives."""
import io
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parent.parent
MANAGED = shlex.split(re.search(r"managed=\((.*?)\n\)", (ROOT / "install.sh").read_text(), re.S)[1])


def member(name, data=b"original\n", kind=tarfile.REGTYPE, target=""):
    item = tarfile.TarInfo(name)
    item.type, item.linkname, item.mode = kind, target, 0o755
    item.size = len(data) if item.isfile() else 0
    return item, data


def archive(path, entries):
    with tarfile.open(path, "w:gz") as output:
        for item, data in entries:
            output.addfile(item, io.BytesIO(data) if item.isfile() else None)


def fixture(temp, entries):
    agent, backup = Path(temp) / "agent", Path(temp) / "backup"
    agent.mkdir(); backup.mkdir()
    (agent / "settings.json").write_bytes(b"current\n")
    (agent / "private.txt").write_bytes(b"unmanaged\n")
    (backup / "state.json").write_text(json.dumps({"agentDir": str(agent), "agentManaged": MANAGED, "agentPresent": ["settings.json", "npm"]}))
    archive(backup / "agent-files.tar.gz", entries)
    return agent, backup


def restore(agent, backup):
    return subprocess.run(["bash", str(ROOT / "uninstall.sh"), "--backup", str(backup)], env={**os.environ, "PI_CODING_AGENT_DIR": str(agent)}, capture_output=True, text=True, timeout=30)


with tempfile.TemporaryDirectory(prefix="pi-rollback-link-") as temp:
    target = "npm/node_modules/jiti/lib/jiti-cli.mjs"
    agent, backup = fixture(temp, [member("settings.json"), member(target), member("npm/node_modules/.bin/jiti", kind=tarfile.SYMTYPE, target="../jiti/lib/jiti-cli.mjs"), member("npm/hard", kind=tarfile.LNKTYPE, target=target)])
    result = restore(agent, backup)
    assert result.returncode == 0, result.stdout + result.stderr
    assert (agent / "settings.json").read_bytes() == b"original\n"
    link = agent / "npm/node_modules/.bin/jiti"
    assert link.is_symlink() and os.readlink(link) == "../jiti/lib/jiti-cli.mjs"
    assert link.read_bytes() == b"original\n" and link.stat().st_mode & 0o111
    assert (agent / "npm/hard").stat().st_ino == (agent / target).stat().st_ino
    assert (agent / "private.txt").read_bytes() == b"unmanaged\n"
print("PASS real rollback restores internal npm symlink/hardlink, bytes and executable mode")


def snapshot(directory):
    result = {}
    for path in directory.rglob("*"):
        key = str(path.relative_to(directory))
        if path.is_symlink():
            result[key] = ("link", os.readlink(path))
        elif path.is_file():
            result[key] = (path.read_bytes(), path.stat().st_mode & 0o777)
        else:
            result[key] = ("directory", path.stat().st_mode & 0o777)
    return result


cases = {
    "traversal": lambda t: member("npm/../../escaped"),
    "absolute member": lambda t: member(str(Path(t) / "escaped")),
    "absolute symlink": lambda t: member("npm/link", kind=tarfile.SYMTYPE, target=str(Path(t) / "outside")),
    "outside symlink": lambda t: member("npm/link", kind=tarfile.SYMTYPE, target="../../escaped"),
    "unmanaged symlink": lambda t: member("npm/link", kind=tarfile.SYMTYPE, target="../private.txt"),
    "outside hardlink": lambda t: member("npm/link", kind=tarfile.LNKTYPE, target="../escaped"),
    "unmanaged member": lambda t: member("private.txt"),
    "fifo": lambda t: member("npm/fifo", kind=tarfile.FIFOTYPE),
}
for name, make in cases.items():
    with tempfile.TemporaryDirectory(prefix="pi-rollback-reject-") as temp:
        agent, backup = fixture(temp, [member("settings.json"), member("npm/file"), make(temp)])
        (Path(temp) / "outside").write_bytes(b"outside\n")
        before = snapshot(agent)
        result = restore(agent, backup)
        assert result.returncode != 0, (name, result.stdout)
        assert "PASS restored" not in result.stdout, name
        assert snapshot(agent) == before, name
        assert not (Path(temp) / "escaped").exists(), name
        assert (Path(temp) / "outside").read_bytes() == b"outside\n", name

for name in ["missing", "truncated", "bad gzip checksum", "missing expected path", "wrong agent", "unknown managed path", "chain", "cycle", "write through chain", "destination parent", "file parent", "internal parent"]:
    with tempfile.TemporaryDirectory(prefix="pi-rollback-preflight-") as temp:
        entries = [member("settings.json"), member("npm/file")]
        if name == "chain":
            entries += [member("npm/a", kind=tarfile.SYMTYPE, target="."), member("npm/b", kind=tarfile.SYMTYPE, target="a/../../escaped")]
        if name == "cycle":
            entries += [member("npm/a", kind=tarfile.SYMTYPE, target="b"), member("npm/b", kind=tarfile.SYMTYPE, target="a")]
        if name == "write through chain":
            entries += [member("npm/link", kind=tarfile.SYMTYPE, target="../maintenance"), member("npm/link/file")]
        if name == "destination parent":
            entries += [member("extensions/loop-profiler.ts")]
        agent, backup = fixture(temp, entries)
        payload = backup / "agent-files.tar.gz"
        if name == "missing": payload.unlink()
        if name == "truncated": payload.write_bytes(b"not an archive")
        if name == "bad gzip checksum":
            data = bytearray(payload.read_bytes()); data[-8] ^= 0xff; payload.write_bytes(data)
        if name == "missing expected path": archive(payload, [member("settings.json")])
        if name in ["wrong agent", "unknown managed path"]:
            state = json.loads((backup / "state.json").read_text())
            if name == "wrong agent": state["agentDir"] = str(Path(temp) / "another-agent")
            else: state["agentManaged"].append("private.txt")
            (backup / "state.json").write_text(json.dumps(state))
        if name == "destination parent":
            outside = Path(temp) / "outside"; outside.mkdir()
            (outside / "loop-profiler.ts").write_bytes(b"outside\n")
            (agent / "extensions").symlink_to(outside, target_is_directory=True)
            state = json.loads((backup / "state.json").read_text())
            state["agentPresent"].append("extensions/loop-profiler.ts")
            (backup / "state.json").write_text(json.dumps(state))
        if name == "file parent":
            (agent / "extensions").write_bytes(b"not a directory\n")
        if name == "internal parent":
            (agent / "private-dir").mkdir()
            (agent / "extensions").symlink_to(agent / "private-dir", target_is_directory=True)
        before = snapshot(agent)
        result = restore(agent, backup)
        assert result.returncode != 0, (name, result.stdout)
        assert snapshot(agent) == before, name
        if name == "destination parent": assert (outside / "loop-profiler.ts").read_bytes() == b"outside\n"
print("PASS unsafe members/links/chains, special files, missing/corrupt payload and destination parents fail before mutation")

# Invoke the actual installer; PATH stubs fail npm ci without any registry/provider traffic.
import sys
for fail_restore, fresh in [(False, False), (True, False), (False, True)]:
    with tempfile.TemporaryDirectory(prefix="pi-installer-rollback-") as temp:
        temp = Path(temp); agent = temp / "agent"; agent.mkdir(mode=0o700)
        for parent in ["extensions", "skills"]:
            (agent / parent).mkdir(mode=0o700)
        (agent / "private.txt").write_bytes(b"unmanaged\n")
        if not fresh:
            (agent / "settings.json").write_bytes(b"original\n")
            target = agent / "npm/lib/jiti.mjs"; target.parent.mkdir(parents=True)
            target.write_bytes(b"original npm\n"); target.chmod(0o755)
            link = agent / "npm/.bin/jiti"; link.parent.mkdir()
            link.symlink_to("../lib/jiti.mjs")
        before = snapshot(agent)
        bin_dir = temp / "bin"; bin_dir.mkdir()
        scripts = {
            "pi": f"#!/bin/sh\necho {json.loads((ROOT / 'manifest.json').read_text())['piCoreVersion']}\n",
            "python3": f'#!/bin/sh\nif [ "$1" = "{ROOT}/scripts/test-release.py" ]; then exit 0; fi\nexec {shlex.quote(sys.executable)} "$@"\n',
            "npm": f'''#!{sys.executable}
import os,sys
from pathlib import Path
if sys.argv[1:] == ["--version"]:
    print("fixture-npm"); sys.exit(0)
agent=Path(os.environ['PI_CODING_AGENT_DIR'])
(agent/'settings.json').write_bytes(b'changed by failed install\\n')
if os.environ['FAIL_RESTORE']=='1':
    next(Path(os.environ['PI_BACKUP_DIR']).glob('*/agent-files.tar.gz')).write_bytes(b'corrupt')
sys.exit(73)
''',
        }
        scripts.update({name: "#!/bin/sh\necho fixture-version\n" for name in ["uv", "tmux"]})
        for name, text in scripts.items():
            path = bin_dir / name; path.write_text(text); path.chmod(0o755)
        env = {**os.environ, "PATH": str(bin_dir) + os.pathsep + os.environ["PATH"], "PI_CODING_AGENT_DIR": str(agent), "PI_BACKUP_DIR": str(temp / "backups"), "FAIL_RESTORE": "1" if fail_restore else "0"}
        result = subprocess.run(["bash", str(ROOT / "install.sh"), "--preserve-settings"], env=env, capture_output=True, text=True, timeout=45)
        assert result.returncode == 73, result.stdout + result.stderr
        assert agent.stat().st_mode & 0o777 == 0o700
        if fail_restore:
            assert "FAIL rollback not confirmed" in result.stderr, result.stdout + result.stderr
            assert "PASS restored" not in result.stdout
            assert (agent / "settings.json").read_bytes() == b"changed by failed install\n"
            assert (agent / "private.txt").read_bytes() == b"unmanaged\n"
        else:
            assert "PASS restored" in result.stdout, result.stdout + result.stderr
            after = snapshot(agent)
            assert after == before, (fresh, {k: (before.get(k), after.get(k)) for k in before.keys() | after.keys() if before.get(k) != after.get(k)}, result.stdout + result.stderr)
print("PASS actual installer error trap: successful, fresh-empty and explicitly failed rollback preserve original failure status")
