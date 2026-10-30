"""Validate fresh-install source checks without an existing Pi runtime."""

import importlib.util
import os
import subprocess
import sys
import tempfile
import unittest
import unittest.mock
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class InstallerPreflightTest(unittest.TestCase):
    """Keep install preflight independent of the installation it will create."""

    def test_release_scan_prunes_only_excluded_directories(self):
        """Skip runtime trees before descent without skipping source files."""
        spec = importlib.util.spec_from_file_location(
            "release_check", ROOT / "scripts/test-release.py")
        release = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(release)
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for name in (".git", "node_modules", "test-results",
                         "src", "node_modules-not-ignored"):
                directory = root / name / "nested"
                directory.mkdir(parents=True)
                (directory / "fixture.txt").write_text("fixture")
            visited = []
            walk = os.walk

            def record_walk(*args, **kwargs):
                """Record actual descent while preserving walk pruning."""
                for directory, directories, files in walk(*args, **kwargs):
                    visited.append(
                        Path(directory).relative_to(root).as_posix())
                    yield directory, directories, files

            with unittest.mock.patch.object(
                    release.os, "walk", side_effect=record_walk):
                actual = set(release.release_files(root))
            self.assertEqual(actual, {
                root / "src/nested/fixture.txt",
                root / "node_modules-not-ignored/nested/fixture.txt",
            })
            self.assertFalse(any(
                name.split("/")[0] in {".git", "node_modules", "test-results"}
                for name in visited))

    def test_source_only_release_check_needs_no_pi_or_fold_package(self):
        """Check a release with an empty profile and an unusable Pi executable."""
        with tempfile.TemporaryDirectory(prefix="pi-preflight-") as temp:
            home = Path(temp)
            fake_bin = home / "bin"
            fake_bin.mkdir()
            pi = fake_bin / "pi"
            pi.write_text("#!/bin/sh\nexit 97\n")
            pi.chmod(0o755)
            result = subprocess.run(
                [sys.executable, str(
                    ROOT / "scripts/test-release.py"), str(ROOT)],
                env={**os.environ, "HOME": str(home),
                     "PATH": str(fake_bin) + os.pathsep + os.environ["PATH"],
                     "PI_CODING_AGENT_DIR": str(home / "empty-agent"),
                     "PI_TEST_OFFLINE": "1", "PI_RELEASE_SOURCE_ONLY": "1"},
                capture_output=True, text=True, timeout=90, check=False,
            )
            self.assertEqual(result.returncode, 0,
                             result.stdout + result.stderr)
            self.assertIn("SKIP installed-runtime SDK check", result.stdout)
            self.assertFalse((home / "empty-agent").exists())
