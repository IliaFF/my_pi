"""Filesystem integration of real maintenance backup/restore, never production."""
from contextlib import redirect_stdout, redirect_stderr
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("maintenance", ROOT / "scripts/maintenance.py")
maintenance = importlib.util.module_from_spec(spec)
spec.loader.exec_module(maintenance)


class RollbackTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="pi-rollback-test-")
        self.addCleanup(self.temp.cleanup)
        base = Path(self.temp.name) / "source"
        self.agent = Path(self.temp.name) / "agent"
        base.mkdir()
        self.agent.mkdir()
        manifest = {"patchedPackages": [], "managedConfigs": [{"source": "extensions/safe.ts", "snapshot": "local-extensions/safe.ts", "restore": True}]}
        (base / "manifest.json").write_text(json.dumps(manifest))
        self.target = self.agent / "extensions/safe.ts"
        self.target.parent.mkdir()
        self.target.write_text("known-good")
        (self.agent / "settings.json").write_text('{"packages": []}')
        npm = self.agent / "npm"
        npm.mkdir()
        (npm / "package.json").write_text('{"dependencies": {}}')
        (npm / "package-lock.json").write_text('{"lockfileVersion": 3}')
        (self.agent / "auth.json").write_text('{"private": "fixture-not-a-key"}')
        self.patch = patch.multiple(maintenance, BASE=base, MANIFEST_PATH=base / "manifest.json", AGENT_DIR=self.agent, NPM_ROOT=npm / "node_modules")
        self.patch.start()
        self.addCleanup(self.patch.stop)
        output = io.StringIO()
        with redirect_stdout(output):
            self.assertEqual(maintenance.backup(), 0)
        self.backup = Path(output.getvalue().strip())
        self.metadata = self.backup / "backup-manifest.json"

    def restore(self):
        output = io.StringIO()
        with redirect_stdout(output), redirect_stderr(output):
            result = maintenance.restore_backup(str(self.backup))
        self.last_restore_output = output.getvalue()
        return result

    def test_restore_real_archive_and_managed_file(self):
        self.target.write_text("regression")
        (self.agent / "npm/package.json").write_text('{"broken": true}')
        self.assertEqual(self.restore(), 0)
        self.assertEqual(self.target.read_text(), "known-good")
        self.assertEqual(json.loads((self.agent / "npm/package.json").read_text()), {"dependencies": {}})
        self.assertFalse((self.backup / "auth.json").exists())

    def test_corrupted_payload_rejected_before_writes(self):
        self.target.write_text("current")
        (self.backup / "extensions/safe.ts").write_text("tampered")
        self.assertEqual(self.restore(), 1)
        self.assertEqual(self.target.read_text(), "current")

    def test_unmanaged_destination_rejected_before_writes(self):
        data = json.loads(self.metadata.read_text())
        data["files"].append({"path": str(self.agent / "auth.json"), "sha256": "invalid"})
        self.metadata.write_text(json.dumps(data))
        self.target.write_text("current")
        self.assertEqual(self.restore(), 1)
        self.assertEqual(self.target.read_text(), "current")
        self.assertEqual(json.loads((self.agent / "auth.json").read_text())["private"], "fixture-not-a-key")

    def test_corrupted_archive_rejected_before_writes(self):
        self.target.write_text("current")
        (self.backup / "npm-tree.tar.gz").write_bytes(b"bad archive")
        self.assertEqual(self.restore(), 1)
        self.assertEqual(self.target.read_text(), "current")
