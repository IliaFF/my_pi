"""Check retired Pi plugin and preservation of private Herdr preferences."""

import json
import os
import pathlib
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent


class HerdrAdoptionTests(unittest.TestCase):
    """Exercise portable config bootstrap without a real Herdr server."""

    def test_retired_plugin_and_conservative_saved_defaults(self):
        """Omit the Pi plugin without deleting saved Herdr preferences."""
        package = json.loads((ROOT / "npm/package.json").read_text())
        self.assertNotIn("pi-herdr-agents", package["dependencies"])
        self.assertEqual(package["dependencies"]["pi-workspace-history"],
                         "0.5.2")
        settings = json.loads((ROOT / "configs/settings.json").read_text())
        self.assertNotIn("npm:pi-herdr-agents@3.3.1", settings["packages"])
        config = json.loads(
            (ROOT / "configs/herdr-agents/config.json").read_text())
        self.assertEqual(config, {"status": {"enabled": True},
                                  "sidebar": {"enabled": True},
                                  "persistent": {"maxAgents": 1}})

    def test_bootstrap_preserves_existing_config(self):
        """Initialize missing config and retain custom bytes in both modes."""
        source = (ROOT / "install.sh").read_text()
        script = source.split("# Personal configuration start", 1)[1].split(
            "# Personal configuration end", 1)[0]
        with tempfile.TemporaryDirectory(prefix="pi-herdr-bootstrap-") as temp:
            agent = pathlib.Path(temp)
            config = agent / "herdr-agents/config.json"
            env = dict(os.environ, AGENT_DIR=temp, ROOT=str(ROOT),
                       CONTEXT_SETTINGS=str(agent / "my-pi-settings.json"))
            for preserve in ("1", "0"):
                env["PRESERVE_SETTINGS"] = preserve
                subprocess.run(["bash", "-euc", script], env=env, check=True,
                               capture_output=True, text=True, timeout=30)
                self.assertTrue(config.exists())
                if preserve == "1":
                    self.assertEqual(config.read_bytes(),
                                     (ROOT / "configs/herdr-agents/config.json").read_bytes())
                else:
                    self.assertEqual(config.read_bytes(),
                                     b'{"sidebar":{"enabled":false},"private":true}\n')
                config.write_bytes(
                    b'{"sidebar":{"enabled":false},"private":true}\n')
            self.assertEqual(config.read_bytes(),
                             b'{"sidebar":{"enabled":false},"private":true}\n')
