"""Keep the delegation threshold explicit without claiming runtime enforcement."""

import pathlib
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent


class MultiwindowPolicyTests(unittest.TestCase):
    """Check portable instructions, not autonomous model behavior."""

    def test_managed_context_threshold_and_execution_boundaries(self):
        """Preserve the user's threshold and existing execution restrictions."""
        policy = (ROOT / "configs/APPEND_SYSTEM.md").read_text()
        self.assertEqual(policy.count("# Long-lived delegation"), 1)
        for rule in (
            "more than one context window",
            "folding, recall and compaction",
            "Small scouts and prototypes stay in the parent",
            "goal, boundaries and verifiable output",
            "goal, constraints, progress and evidence across context cycles",
            "does not authorize agent launches",
            "not a substitute for native sequential task handoff",
            "Clarify unclear user intent",
        ):
            with self.subTest(rule=rule):
                self.assertIn(rule, policy)

    def test_offline_probe_syntax_and_network_denials(self):
        """Validate optional harnesses without requiring candidate installations."""
        for script in ("evaluate-long-lived-agents.mjs",
                       "evaluate-durable-child.mjs",
                       "evaluate-herdr-spawn.mjs"):
            with self.subTest(script=script):
                subprocess.run(
                    ["node", "--check", str(ROOT / "scripts" / script)],
                    check=True, capture_output=True, text=True, timeout=15)
        subprocess.run(
            ["node", str(ROOT / "scripts/no-network-fake-herdr.cjs")],
            check=True, capture_output=True, text=True, timeout=15)
