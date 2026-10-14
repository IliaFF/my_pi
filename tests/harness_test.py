import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("build_gate", ROOT / "scripts/test-build.py")
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class HarnessTests(unittest.TestCase):
    def run_case(self, args, timeout=2):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            result = gate.run_check("probe", "unit", args, env=dict(os.environ), output=output, timeout=timeout)
            return result, (output / "probe.log").read_text()

    def test_success_and_log(self):
        result, log = self.run_case(["python3", "-c", "print('checked')"])
        self.assertTrue(result["passed"])
        self.assertEqual(result["exitCode"], 0)
        self.assertIn("checked", log)

    def test_nonzero_is_not_pass(self):
        result, _ = self.run_case(["python3", "-c", "raise SystemExit(7)"])
        self.assertFalse(result["passed"])
        self.assertEqual(result["exitCode"], 7)
        json.dumps(result)

    def test_timeout_is_failure(self):
        result, _ = self.run_case(["python3", "-c", "import time; time.sleep(30)"], timeout=0.05)
        self.assertFalse(result["passed"])
        self.assertEqual(result["exitCode"], 124)
        self.assertIn("timeout", result["error"])

    def test_missing_executable_is_failure(self):
        result, _ = self.run_case(["/does-not-exist/pi-build-check"])
        self.assertEqual(result["exitCode"], 127)
        self.assertFalse(result["passed"])

    def test_git_excludes_runtime_but_keeps_source(self):
        paths = ["node_modules", "npm/node_modules", "context-fold/fixture/seed-index.jsonl", "test-results/results.json",
                 "auth.json", "sessions/private.jsonl", ".npmrc", ".env", ".pi/settings.json"]
        result = subprocess.run(["git", "-C", str(ROOT), "check-ignore", "--no-index", "--stdin"],
            input="\n".join(paths) + "\n", capture_output=True, text=True, timeout=5)
        self.assertEqual(set(result.stdout.splitlines()), set(paths), result.stdout + result.stderr)
        public = subprocess.run(["git", "-C", str(ROOT), "check-ignore", "--no-index", "manifest.json", "npm/package-lock.json",
            "openspec/config.yaml", ".github/workflows/test.yml"], capture_output=True, text=True, timeout=5)
        self.assertEqual(public.returncode, 1, public.stdout + public.stderr)

    def test_invalid_openspec_is_rejected(self):
        with tempfile.TemporaryDirectory(prefix="pi-invalid-spec-") as temp:
            root = Path(temp)
            spec_dir = root / "openspec/specs/broken"
            spec_dir.mkdir(parents=True)
            (root / "openspec/config.yaml").write_text("schema: spec-driven\n")
            (spec_dir / "spec.md").write_text("# Broken\n\n## Purpose\n\nThis fixture verifies strict rejection of requirements that lack scenarios.\n\n## Requirements\n\n### Requirement: Broken\nThe system MUST reject malformed specs.\n")
            result = subprocess.run([str(ROOT / "node_modules/.bin/openspec"), "validate", "--all", "--strict", "--no-interactive"],
                cwd=root, env=dict(os.environ, OPENSPEC_TELEMETRY="0"), capture_output=True, text=True, timeout=10)
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_smoke_network_guard(self):
        result, log = self.run_case(["node", "--require", str(ROOT / "scripts/no-network.cjs"), "--eval",
            "const a=require('node:assert/strict');a.throws(()=>require('node:https').get('https://example.invalid'),/NETWORK_BLOCKED/);fetch('https://example.invalid').then(()=>process.exit(2),e=>a.match(e.message,/NETWORK_BLOCKED/))"])
        self.assertTrue(result["passed"], log)
        self.assertIn("NETWORK_BLOCKED", log)
