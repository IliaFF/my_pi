"""Exercise installer backup restore without touching the personal runtime."""

import io
import json
import os
import re
import subprocess
import tarfile
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class InstallerRestoreTest(unittest.TestCase):
    """Validate before replacing managed files, including normal npm links."""

    def setUp(self):
        """Create isolated current files and a synthetic installer backup."""
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.agent = self.root / "agent"
        self.backup = self.root / "backup"
        self.backup.mkdir()
        (self.agent / "extensions").mkdir(parents=True, mode=0o700)
        (self.agent / "npm").mkdir()
        (self.agent / "settings.json").write_text("current settings")
        (self.agent / "extensions/task-session.ts").write_text("current task")
        (self.agent / "auth.json").write_text("private fixture")
        (self.agent / "auth.json").chmod(0o600)
        (self.agent / ".my-pi-last-backup").write_text(str(self.backup))
        section = re.search(r"managed=\(\n([\s\S]*?)\n\)",
                            (ROOT / "install.sh").read_text()).group(1)
        self.managed = re.findall(r'"([^"]+)"', section)
        self.present = ["settings.json", "npm", "extensions/task-session.ts"]
        self.entries = [
            ("settings.json", "saved settings", None),
            ("extensions/task-session.ts", "saved task", None),
            ("npm/node_modules/pkg/cli.js", "saved CLI", None),
            ("npm/node_modules/.bin/tool", None, "../pkg/cli.js"),
        ]
        self.write_backup()

    def write_backup(self, extra=(), missing=False, legacy=False, special=()):
        """Create a synthetic archive with the installer's actual managed set."""
        managed = list(self.managed)
        present = list(self.present)
        entries = list(self.entries)
        if missing:
            entries = [e for e in entries if e[0]
                       != "extensions/task-session.ts"]
        if legacy:
            managed.remove("herdr-agents/config.json")
            managed.remove("extensions/task-session.ts")
            present.remove("extensions/task-session.ts")
            entries = [e for e in entries if e[0]
                       != "extensions/task-session.ts"]
        state = {"agentDir": str(self.agent), "agentManaged": managed,
                 "agentPresent": present, "oldCoreVersion": "1.3.0"}
        (self.backup / "state.json").write_text(json.dumps(state))
        with tarfile.open(self.backup / "agent-files.tar.gz", "w:gz") as archive:
            for name, text, link in entries + list(extra):
                info = tarfile.TarInfo(name)
                info.mode = 0o755 if name.endswith("cli.js") else 0o600
                if link is not None:
                    info.type = tarfile.SYMTYPE
                    info.linkname = link
                    archive.addfile(info)
                else:
                    data = text.encode()
                    info.size = len(data)
                    archive.addfile(info, io.BytesIO(data))
            for info in special:
                archive.addfile(info)

    def invoke(self, dry_run=False):
        """Run the public shell entrypoint with an isolated agent directory."""
        args = ["bash", str(ROOT / "uninstall.sh"),
                "--backup", str(self.backup)]
        if dry_run:
            args.append("--dry-run")
        return subprocess.run(
            args, env=dict(os.environ, PI_CODING_AGENT_DIR=str(self.agent)),
            text=True, capture_output=True, timeout=10, check=False)

    def assert_current_unchanged(self):
        """Keep private and managed data unchanged after a failed preflight."""
        self.assertEqual(
            (self.agent / "settings.json").read_text(), "current settings")
        self.assertEqual(
            (self.agent / "extensions/task-session.ts").read_text(), "current task")
        self.assertEqual(
            (self.agent / "auth.json").read_text(), "private fixture")
        self.assertTrue((self.agent / ".my-pi-last-backup").exists())

    def test_pre_herdr_backup_is_accepted(self):
        """Retain the exact previous managed set with task-session present."""
        self.managed.remove("herdr-agents/config.json")
        self.write_backup()
        self.assertEqual(self.invoke(dry_run=True).returncode, 0)
        self.assert_current_unchanged()

    def test_herdr_config_restore(self):
        """Restore new config bytes alongside the current managed set."""
        config = self.agent / "herdr-agents/config.json"
        config.parent.mkdir()
        config.write_text("current Herdr config")
        self.present.append("herdr-agents/config.json")
        self.entries.append(("herdr-agents/config.json",
                            "saved Herdr config", None))
        self.write_backup()
        result = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(config.read_text(), "saved Herdr config")

    def test_current_backup_dry_run(self):
        """Accept task-session and normal relative npm links without restoring."""
        result = self.invoke(dry_run=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_current_unchanged()

    def test_current_backup_restore(self):
        """Restore managed bytes and links, retaining private files and parents."""
        parent_mode = (self.agent / "extensions").stat().st_mode & 0o777
        result = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            (self.agent / "settings.json").read_text(), "saved settings")
        self.assertEqual(
            (self.agent / "extensions/task-session.ts").read_text(), "saved task")
        link = self.agent / "npm/node_modules/.bin/tool"
        self.assertTrue(link.is_symlink())
        self.assertEqual(os.readlink(link), "../pkg/cli.js")
        self.assertEqual(link.read_text(), "saved CLI")
        self.assertEqual(
            (self.agent / "auth.json").read_text(), "private fixture")
        self.assertEqual(
            (self.agent / "auth.json").stat().st_mode & 0o777, 0o600)
        self.assertEqual(
            (self.agent / "extensions").stat().st_mode & 0o777, parent_mode)
        self.assertFalse((self.agent / ".my-pi-last-backup").exists())

    def test_unsafe_members_fail_before_mutation(self):
        """Reject escapes, unmanaged writes, outside links and special devices."""
        for entry in [("../escape", "bad", None), ("auth.json", "bad", None),
                      ("npm/link", None, "/tmp/outside"),
                      ("npm/link", None, "../../outside"),
                      ("npm/link", None, "../auth.json")]:
            with self.subTest(entry=entry):
                self.write_backup(extra=[entry])
                self.assertNotEqual(self.invoke().returncode, 0)
                self.assert_current_unchanged()
        for kind, target in [(tarfile.FIFOTYPE, ""),
                             (tarfile.LNKTYPE, "auth.json"),
                             (tarfile.LNKTYPE, "../outside")]:
            info = tarfile.TarInfo("npm/unsafe")
            info.type = kind
            info.linkname = target
            self.write_backup(special=[info])
            self.assertNotEqual(self.invoke().returncode, 0)
            self.assert_current_unchanged()

    def test_internal_hardlink_is_supported(self):
        """Allow normal npm hardlinks without accepting outside targets."""
        info = tarfile.TarInfo("npm/copy")
        info.type = tarfile.LNKTYPE
        info.linkname = "npm/node_modules/pkg/cli.js"
        self.write_backup(special=[info])
        result = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.agent / "npm/copy").read_text(), "saved CLI")

    def test_existing_outside_parent_is_rejected(self):
        """Do not restore through an existing external ancestor symlink."""
        outside = self.root / "outside"
        (self.agent / "extensions").rename(outside)
        (self.agent / "extensions").symlink_to(outside, target_is_directory=True)
        self.assertNotEqual(self.invoke().returncode, 0)
        self.assert_current_unchanged()

    def test_missing_and_corrupt_archives_fail_before_mutation(self):
        """Do not delete current data on partial or corrupted backups."""
        self.write_backup(missing=True)
        self.assertNotEqual(self.invoke().returncode, 0)
        self.assert_current_unchanged()
        (self.backup / "agent-files.tar.gz").write_bytes(b"not an archive")
        self.assertNotEqual(self.invoke().returncode, 0)
        self.assert_current_unchanged()
        (self.backup / "agent-files.tar.gz").unlink()
        self.assertNotEqual(self.invoke().returncode, 0)
        self.assert_current_unchanged()

    def test_other_agent_and_unmanaged_state_are_rejected(self):
        """Restrict the state manifest before interpreting any archive entry."""
        state_path = self.backup / "state.json"
        state = json.loads(state_path.read_text())
        for change in [{"agentDir": str(self.root / "other")},
                       {"agentManaged": self.managed + ["auth.json"]}]:
            state_path.write_text(json.dumps({**state, **change}))
            self.assertNotEqual(self.invoke().returncode, 0)
            self.assert_current_unchanged()

    def test_missing_present_manifest_fails_before_mutation(self):
        """A missing field must not masquerade as a fresh empty backup."""
        state_path = self.backup / "state.json"
        state = json.loads(state_path.read_text())
        state.pop("agentPresent")
        state_path.write_text(json.dumps(state))
        (self.backup / "agent-files.tar.gz").unlink()
        self.assertNotEqual(self.invoke().returncode, 0)
        self.assert_current_unchanged()

    def test_historical_backup_is_supported(self):
        """Do not require newly introduced managed paths in old backups."""
        self.write_backup(legacy=True)
        result = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            (self.agent / "settings.json").read_text(), "saved settings")
        self.assertEqual(
            (self.agent / "extensions/task-session.ts").read_text(), "current task")
