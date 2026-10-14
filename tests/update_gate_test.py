"""Run real update-safe shell against fake Pi/maintenance, no host changes."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent


class UpdateGateTests(unittest.TestCase):
    def run_update(self, fail_gate="", fail_restore="0", dry_run=False):
        with tempfile.TemporaryDirectory(prefix="pi-update-gate-") as temp:
            temp = Path(temp)
            scripts = temp / "scripts"
            scripts.mkdir()
            (scripts / "update-safe.sh").write_bytes((ROOT / "scripts/update-safe.sh").read_bytes())
            (scripts / "maintenance.py").write_text('''import os,sys
from pathlib import Path
root=Path(os.environ["FIXTURE"])
command=sys.argv[1]
with (root/"calls").open("a") as f:f.write(command+"\\n")
if command=="backup":print(root/"backup")
if command=="restore-backup" and os.environ["FAIL_RESTORE"]=="1":sys.exit(1)
''')
            (scripts / "test-build.py").write_text('''import os,sys
from pathlib import Path
root=Path(os.environ["FIXTURE"])
path=root/"gate-count"
n=int(path.read_text())+1 if path.exists() else 1
path.write_text(str(n))
with (root/"calls").open("a") as f:f.write("gate"+str(n)+"\\n")
sys.exit(1 if str(n) in os.environ["FAIL_GATE"].split(",") else 0)
''')
            bin_dir = temp / "bin"
            bin_dir.mkdir()
            pi = bin_dir / "pi"
            pi.write_text('#!/usr/bin/env sh\nprintf "pi-update\\n" >> "$FIXTURE/calls"\nexit 0\n')
            pi.chmod(0o755)
            env = dict(os.environ, FIXTURE=str(temp), FAIL_GATE=fail_gate, FAIL_RESTORE=fail_restore,
                       PATH=f"{bin_dir}:{os.environ['PATH']}", PI_CODING_AGENT_DIR=str(temp / "agent"))
            command = ["bash", str(scripts / "update-safe.sh")]
            if dry_run:
                command.append("--dry-run")
            result = subprocess.run(command, env=env, capture_output=True, text=True, timeout=10)
            calls = (temp / "calls").read_text().splitlines()
            return result, calls

    def test_preflight_failure_never_updates_or_backs_up(self):
        result, calls = self.run_update(fail_gate="1")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(calls, ["gate1"])

    def test_post_update_gate_failure_rolls_back_and_rechecks(self):
        result, calls = self.run_update(fail_gate="2")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(calls, ["gate1", "backup", "pi-update", "restore-configs", "apply", "gate2", "restore-backup", "gate3"])
        self.assertIn("ROLLBACK PASS", result.stderr)

    def test_failed_restore_is_not_reported_as_success(self):
        result, calls = self.run_update(fail_gate="2", fail_restore="1")
        self.assertEqual(result.returncode, 1)
        self.assertIn("ROLLBACK FAIL", result.stderr)
        self.assertNotIn("gate3", calls)

    def test_success_requires_both_gates(self):
        result, calls = self.run_update()
        self.assertEqual(result.returncode, 0)
        self.assertEqual(calls[0], "gate1")
        self.assertEqual(calls[-1], "gate2")
        self.assertNotIn("restore-backup", calls)

    def test_dry_run_only_checks(self):
        result, calls = self.run_update(dry_run=True)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(calls, ["check", "gate1"])
