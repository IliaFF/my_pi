"""Keep private runtime instructions out of portable source snapshots."""

import importlib.util
import json
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent


class PortableSnapshotTests(unittest.TestCase):
    """Exercise maintenance against temporary source and runtime directories."""

    def test_source_only_templates_are_not_captured_or_restored(self):
        """Preserve source templates and private runtime bytes in both directions."""
        spec = importlib.util.spec_from_file_location(
            "portable_maintenance", ROOT / "scripts/maintenance.py")
        maintenance = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(maintenance)
        with tempfile.TemporaryDirectory(prefix="pi-source-only-") as temp:
            root = pathlib.Path(temp)
            source = root / "source"
            agent = root / "agent"
            source.mkdir()
            agent.mkdir()
            (source / "portable.md").write_text("PUBLIC TEMPLATE")
            (agent / "AGENTS.md").write_text("PRIVATE HOST RULES")
            (agent / "ordinary.json").write_text("ordinary managed config")
            manifest = {"managedConfigs": [
                {"source": "AGENTS.md", "snapshot": "portable.md",
                 "restore": False, "snapshotRuntime": False},
                {"source": "ordinary.json", "snapshot": "ordinary.json",
                 "restore": True},
            ]}
            path = source / "manifest.json"
            path.write_text(json.dumps(manifest))
            maintenance.BASE = source
            maintenance.MANIFEST_PATH = path
            maintenance.AGENT_DIR = agent
            self.assertEqual(maintenance.snapshot(), 0)
            self.assertEqual((source / "portable.md").read_text(),
                             "PUBLIC TEMPLATE")
            self.assertEqual((source / "ordinary.json").read_text(),
                             "ordinary managed config")
            self.assertEqual(maintenance.restore_configs(), 0)
            self.assertEqual((agent / "AGENTS.md").read_text(),
                             "PRIVATE HOST RULES")
