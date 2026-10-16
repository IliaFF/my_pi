"""Updater safety checks: no network, OAuth, systemd or publication."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import os
import subprocess
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("vps_updater", ROOT / "scripts/vps-updater.py")
updater = importlib.util.module_from_spec(spec)
spec.loader.exec_module(updater)


class UpdaterTests(unittest.TestCase):
    def test_only_newer_stable_versions(self):
        self.assertEqual(updater.choose_targets({"x": "1.2.0"}, {"x": "1.3.0"}), {"x": "1.3.0"})
        for latest in ["1.1.0", "1.3.0-beta.1", "latest", "https://invalid/x"]:
            self.assertEqual(updater.choose_targets({"x": "1.2.0"}, {"x": latest}), {"x": "1.2.0"})

    def test_core_and_tui_are_aligned(self):
        names = {updater.CORE: "1.3.0", updater.TUI: "1.3.0"}
        self.assertEqual(updater.choose_targets(names, {updater.CORE: "1.4.0", updater.TUI: "1.5.0"}),
                         {updater.CORE: "1.4.0", updater.TUI: "1.4.0"})

    def test_protected_paths_fail_closed(self):
        for path in ["scripts/test-build.py", "tests/x_test.py", ".github/workflows/test.yml", "AGENTS.md", "configs/pi-context.json", "package.json", "openspec/specs/build-validation/spec.md", "deployment/x", "evil.py"]:
            with self.subTest(path=path), self.assertRaises(updater.Rejected):
                updater.check_scope({path: (b"before", False)}, {path: (b"after", False)}, "openspec/changes/archive/update/")

    def test_patch_and_local_extension_changes_allowed(self):
        changed = updater.check_scope({}, {"patches/x+2.0.0.patch": (b"patch", False), "local-extensions/x.ts": (b"code", False)}, "openspec/changes/archive/update/")
        self.assertEqual(len(changed), 2)

    def test_old_openspec_evidence_cannot_be_rewritten(self):
        with self.assertRaises(updater.Rejected):
            updater.check_scope({"openspec/changes/archive/old/evidence.md": (b"old", False)}, {"openspec/changes/archive/old/evidence.md": (b"new", False)}, "openspec/changes/archive/update/")

    def test_symlink_and_oversized_file_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "link").symlink_to("/etc/passwd")
            with self.assertRaises(updater.Rejected):
                updater.read_tree(root)
            (root / "link").unlink()
            (root / "big").write_bytes(b"x" * (updater.MAX_FILE + 1))
            with self.assertRaises(updater.Rejected):
                updater.read_tree(root)

    def test_deps_scripts_and_manifest_configs_are_protected(self):
        tree = updater.read_tree(ROOT)
        dependencies = json.loads(tree["npm/package.json"][0])["dependencies"]
        for path, field, value in [("npm/package.json", "scripts", {"postinstall": "false"}), ("manifest.json", "managedConfigs", [])]:
            after = dict(tree)
            data = json.loads(after[path][0]); data[field] = value
            after[path] = (json.dumps(data).encode(), after[path][1])
            with self.assertRaises(updater.Rejected):
                updater.check_pins(tree, after, dependencies)

    def test_lock_sources_and_patch_paths_are_untrusted(self):
        tree = updater.read_tree(ROOT)
        dependencies = json.loads(tree["npm/package.json"][0])["dependencies"]
        updater.check_pins(tree, tree, dependencies)
        for path, mutate in [
            ("npm/package-lock.json", lambda data: data["packages"]["node_modules/typebox"].update(resolved="https://invalid.example/typebox.tgz")),
            ("manifest.json", lambda data: data["patchedPackages"][0].update(files=["../../auth.json"]))
        ]:
            after = dict(tree)
            data = json.loads(after[path][0]); mutate(data)
            after[path] = (json.dumps(data).encode(), after[path][1])
            with self.assertRaises(updater.Rejected):
                updater.check_pins(tree, after, dependencies)

    def test_release_core_is_not_historical_literal(self):
        self.assertTrue(updater.valid_release_pins("9.8.7", 'PI_VERSION="9.8.7"\n', {updater.CORE: "9.8.7", updater.TUI: "9.8.7"}))
        for version, installer, tui in [("9.8.7", 'PI_VERSION="1.3.0"', "9.8.7"), ("9.8.7-beta.1", 'PI_VERSION="9.8.7-beta.1"', "9.8.7-beta.1"), ("9.8.7", 'PI_VERSION="9.8.7"', "9.8.6")]:
            self.assertFalse(updater.valid_release_pins(version, installer, {updater.CORE: version, updater.TUI: tui}))

    def test_actual_release_gate_accepts_consistent_future_pin(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for name, (content, _) in updater.read_tree(ROOT).items():
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(content)
            for name in ["manifest.json", "npm/package.json", "npm/package-lock.json", "install.sh"]:
                path = root / name
                path.write_text(path.read_text().replace('1.3.0', '9.8.7'))
            result = subprocess.run(["python3", str(ROOT / "scripts/test-release.py"), str(root)], capture_output=True, text=True,
                                    env={**os.environ, "PI_TEST_OFFLINE": "1"}, timeout=30)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_ci_exact_sha_branch_event_and_success(self):
        run = {"head_sha": "a" * 40, "head_branch": "automation/x", "event": "push", "status": "completed", "conclusion": "success", "run_attempt": 1, "id": 10}
        self.assertEqual(updater.ci_result({"workflow_runs": [run]}, "a" * 40, "automation/x"), "success")
        for field, value in [("head_sha", "b" * 40), ("head_branch", "main"), ("event", "pull_request")]:
            self.assertEqual(updater.ci_result({"workflow_runs": [{**run, field: value}]}, "a" * 40, "automation/x"), "pending")
        self.assertEqual(updater.ci_result({"workflow_runs": [{**run, "conclusion": "failure"}]}, "a" * 40, "automation/x"), "failure")
        self.assertEqual(updater.ci_result({"workflow_runs": [run, {**run, "id": 11, "conclusion": "failure"}]}, "a" * 40, "automation/x"), "failure")

    def test_main_must_match_base(self):
        self.assertTrue(updater.can_publish("a", "a", "success"))
        for current, result in [("b", "success"), ("a", "pending"), ("a", "failure")]:
            self.assertFalse(updater.can_publish(current, "a", result))

    def test_atomic_state_roundtrip(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "state.json"
            updater.atomic_json(path, {"pending": {"sha": "a"}, "outbox": ["notice"], "attempts": {"x": 3}})
            self.assertEqual(json.loads(path.read_text())["attempts"]["x"], 3)
            self.assertEqual(list(Path(temp).glob("*.tmp")), [])

    def test_sandbox_no_root_and_separate_gate_credentials(self):
        config = {"node": "/opt/updater/node/bin", "auth_home": "/var/lib/private-auth"}
        for role in ["agent", "test"]:
            command = updater.sandbox_command(config, role, Path("/var/lib/jobs/run"), Path("/var/lib/jobs/run/home"), ["true"], "unit", 10)
            self.assertIn("--uid=pi-update-" + role, command)
            for prop in ["ProtectHome=yes", "ProtectSystem=strict", "NoNewPrivileges=yes", "KillMode=control-group", "RuntimeMaxSec=10", "PartOf=my-pi-updater.service", "TemporaryFileSystem=/tmp:rw,size=512M,mode=1777 /var/tmp:rw,size=512M,mode=1777"]:
                self.assertIn("--property=" + prop, command)
            if role == "test":
                self.assertIn("--property=InaccessiblePaths=/var/lib/private-auth", command)
                self.assertFalse(any("OPENAI_API_KEY" in x or "SSH_AUTH_SOCK" in x for x in command))

    def test_refreshed_oauth_rejects_symlink_parent_and_api_keys(self):
        with tempfile.TemporaryDirectory() as temp:
            home = Path(temp)
            (home / ".pi").symlink_to("/root/.pi")
            with self.assertRaises(updater.Rejected):
                updater.read_oauth(home)
            (home / ".pi").unlink()
            (home / ".pi/agent").mkdir(parents=True)
            (home / ".pi/agent/auth.json").write_text(json.dumps({"openai": {"type": "api_key", "key": "fixture"}}))
            with self.assertRaises(updater.Rejected):
                updater.read_oauth(home)

    def make_controller(self, temp):
        return updater.Updater({"state": temp, "hermes": "/fake/hermes", "github_repo": "IliaFF/my_pi"})

    def test_new_oauth_refresh_metadata_is_preserved(self):
        with tempfile.TemporaryDirectory() as temp:
            home = Path(temp)
            path = home / ".pi/agent/auth.json"
            path.parent.mkdir(parents=True)
            credential = {"type": "oauth", "access": "fixture-access-token", "refresh": "fixture-refresh-token", "expires": 2000000000000, "clientId": "fixture-client", "scopes": ["chatgpt.tokens.use.direct"]}
            path.write_text(json.dumps({"openai": credential}))
            self.assertEqual(updater.read_oauth(home), {"openai": credential})
            del credential["clientId"]
            path.write_text(json.dumps({"openai": credential}))
            with self.assertRaises(updater.Rejected):
                updater.read_oauth(home)

    def test_login_helper_self_check(self):
        result = subprocess.run(["node", str(ROOT / "deployment/vps-updater/login.mjs"), "--self-test"], capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_notification_failure_keeps_outbox(self):
        with tempfile.TemporaryDirectory() as temp:
            controller = self.make_controller(temp)
            with patch.object(updater.subprocess, "run", return_value=subprocess.CompletedProcess([], 1)):
                controller.notify("notice")
            self.assertEqual(json.loads(controller.state_path.read_text())["outbox"], ["notice"])
            with patch.object(updater.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)):
                controller.flush_notifications()
            self.assertEqual(json.loads(controller.state_path.read_text())["outbox"], [])

    def test_failed_ci_and_changed_main_never_push(self):
        for result, main in [("failure", "base"), ("success", "changed")]:
            with self.subTest(result=result), tempfile.TemporaryDirectory() as temp:
                controller = self.make_controller(temp)
                controller.state["pending"] = {"sha": "candidate", "base": "base", "branch": "automation/x", "fingerprint": "x"}
                with patch.object(controller, "remote_main", return_value=main), patch.object(controller, "git") as git, patch.object(updater, "fetch_json", return_value={}), patch.object(updater, "ci_result", return_value=result):
                    with self.assertRaises(updater.Rejected):
                        controller.resume()
                    git.assert_not_called()

    def test_successful_ci_pushes_only_tested_sha(self):
        with tempfile.TemporaryDirectory() as temp:
            controller = self.make_controller(temp)
            controller.state["pending"] = {"sha": "candidate", "base": "base", "branch": "automation/x", "fingerprint": "x"}
            with patch.object(controller, "remote_main", return_value="base"), patch.object(controller, "git", return_value="base") as git, patch.object(controller, "notify"), patch.object(updater, "fetch_json", return_value={}), patch.object(updater, "ci_result", return_value="success"):
                controller.resume()
                self.assertEqual(git.call_args_list[-1].args, ("push", "--force-with-lease=refs/heads/main:base", "origin", "candidate:refs/heads/main"))
            self.assertNotIn("pending", json.loads(controller.state_path.read_text()))

    def test_already_published_candidate_does_not_push_again(self):
        with tempfile.TemporaryDirectory() as temp:
            controller = self.make_controller(temp)
            controller.state["pending"] = {"sha": "candidate", "base": "base", "branch": "automation/x", "fingerprint": "x"}
            with patch.object(controller, "remote_main", return_value="candidate"), patch.object(controller, "git") as git, patch.object(controller, "notify"):
                controller.resume()
                git.assert_not_called()
            self.assertNotIn("pending", controller.state)

    def test_attempt_history_survives_new_release_fingerprint(self):
        with tempfile.TemporaryDirectory() as temp:
            controller = self.make_controller(temp)
            controller.config["jobs"] = temp
            controller.state["attempts"] = {"older-fingerprint": 3}
            tree = updater.read_tree(ROOT)
            dependencies = json.loads(tree["npm/package.json"][0])["dependencies"]
            latest = [{"version": "999.0.0" if name == "pi-token-speed" else version} for name, version in dependencies.items()]
            with patch.object(controller, "baseline", return_value=("base", tree)), patch.object(updater, "fetch_json", side_effect=latest), patch.object(updater.shutil, "disk_usage", return_value=Mock(free=10 ** 12)), patch.object(updater.subprocess, "run", side_effect=subprocess.CalledProcessError(1, "mount")):
                with self.assertRaises(subprocess.CalledProcessError):
                    controller.run()
            persisted = json.loads(controller.state_path.read_text())["attempts"]
            self.assertEqual(persisted["older-fingerprint"], 3)
            self.assertEqual(len(persisted), 2)

    def test_retry_and_pending_take_priority(self):
        self.assertEqual(updater.next_action({"pending": {"sha": "x"}, "attempts": {"x": 3}}, "x"), "resume")
        self.assertEqual(updater.next_action({"attempts": {"x": 3}}, "x"), "exhausted")
        self.assertEqual(updater.next_action({"attempts": {"x": 2}}, "x"), "repair")
