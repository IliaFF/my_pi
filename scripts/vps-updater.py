#!/usr/bin/env python3
"""Trusted VPS release controller. Never run this from a writable agent checkout."""
from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import pwd
import re
import resource
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

CORE = "@earendil-works/pi-coding-agent"
TUI = "@earendil-works/pi-tui"
MAX_FILE = 10 * 1024 * 1024
IGNORED = {".git", "node_modules", "test-results", "__pycache__", ".cache", "backups"}
SEMVER = re.compile(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\Z")


class Rejected(RuntimeError):
    pass


def valid_release_pins(version, installer, dependencies):
    return bool(isinstance(version, str) and SEMVER.fullmatch(version)
                and re.findall(r'^PI_VERSION="([^"]+)"$', installer, re.M) == [version]
                and dependencies.get(CORE) == version and dependencies.get(TUI) == version)


def choose_targets(current, latest):
    targets = dict(current)
    for name, version in latest.items():
        if not SEMVER.fullmatch(current[name]):
            raise Rejected("baseline dependency is not a stable exact pin")
        if isinstance(version, str) and SEMVER.fullmatch(version) and tuple(map(int, version.split('.'))) > tuple(map(int, current[name].split('.'))):
            targets[name] = version
    if CORE in targets:
        targets[TUI] = targets[CORE]
    return targets


def read_tree(root):
    result = {}
    total = 0
    for directory, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = [d for d in dirs if d not in IGNORED]
        for name in dirs + [f for f in files if f not in IGNORED]:
            path = Path(directory) / name
            info = path.lstat()
            if stat.S_ISDIR(info.st_mode):
                continue
            if not stat.S_ISREG(info.st_mode) or info.st_size > MAX_FILE:
                raise Rejected("non-regular or oversized candidate file")
            total += info.st_size
            if total > 64 * 1024 * 1024 or len(result) >= 3000:
                raise Rejected("candidate tree exceeds limit")
            result[path.relative_to(root).as_posix()] = (path.read_bytes(), bool(info.st_mode & 0o111))
    return result


def settings_for_targets(before, targets):
    original, executable = before["configs/settings.json"]
    settings = json.loads(original)
    current = json.loads(before["npm/package.json"][0])["dependencies"]
    replacements = {f"npm:{name}@{version}": f"npm:{name}@{targets[name]}" for name, version in current.items()}
    changed = False
    for index, entry in enumerate(settings["packages"]):
        source = entry if isinstance(entry, str) else entry["source"]
        replacement = replacements.get(source, source)
        if replacement == source:
            continue
        changed = True
        if isinstance(entry, str):
            settings["packages"][index] = replacement
        else:
            entry["source"] = replacement
    return ((json.dumps(settings, indent=2, ensure_ascii=False) + "\n").encode() if changed else original, executable)


def check_scope(before, after, change_prefix):
    changed = sorted(p for p in before.keys() | after.keys() if before.get(p) != after.get(p))
    for path in changed:
        allowed = path in {"manifest.json", "npm/package.json", "npm/package-lock.json", "install.sh", "README.md", "configs/settings.json"}
        allowed |= path.startswith("patches/") and path.endswith(".patch")
        allowed |= path.startswith("local-extensions/") and path.endswith((".ts", ".js", ".json", ".md"))
        allowed |= path.startswith("docs/") and path.endswith(".md")
        allowed |= path.startswith(change_prefix) and path.endswith((".md", ".yaml")) and path not in before
        if not allowed:
            active = re.fullmatch(r"openspec/changes/(autoupdate-[a-f0-9]{12})/.+", path)
            if path not in before and active and change_prefix.endswith("-" + active[1] + "/"):
                raise Rejected("repair incomplete: current OpenSpec change is not archived; inspect private agent log for blockers")
            raise Rejected("protected path changed: " + path)
    return changed


def check_pins(before, after, targets):
    if after.get("configs/settings.json") != settings_for_targets(before, targets):
        raise Rejected("settings differ from controller-prepared exact pins")

    def data(tree, path):
        if path not in tree:
            raise Rejected("required release file removed")
        return json.loads(tree[path][0])
    old = data(before, "npm/package.json")
    new = data(after, "npm/package.json")
    if new.get("dependencies") != targets or {k: v for k, v in old.items() if k != "dependencies"} != {k: v for k, v in new.items() if k != "dependencies"}:
        raise Rejected("dependency set, scripts or native-script policy changed")
    lock = data(after, "npm/package-lock.json")
    if lock.get("packages", {}).get("", {}).get("dependencies") != targets:
        raise Rejected("lock root pins differ")
    for name, entry in lock["packages"].items():
        if not name:
            continue
        url = urllib.parse.urlsplit(entry.get("resolved", ""))
        if url.scheme != "https" or url.hostname != "registry.npmjs.org" or url.username or url.password or not re.fullmatch(r"sha512-[A-Za-z0-9+/]+={0,2}", entry.get("integrity", "")):
            raise Rejected("untrusted lock source or missing integrity")
    manifest = data(after, "manifest.json")
    original = data(before, "manifest.json")
    if {k: v for k, v in manifest.items() if k not in {"piCoreVersion", "patchedPackages"}} != {k: v for k, v in original.items() if k not in {"piCoreVersion", "patchedPackages"}}:
        raise Rejected("managed configuration or manifest policy changed")
    if not valid_release_pins(manifest.get("piCoreVersion"), after["install.sh"][0].decode(), targets):
        raise Rejected("inconsistent core, TUI or installer pin")
    if re.sub(rb'^PI_VERSION="[^"]+"$', b'PI_VERSION="PIN"', before["install.sh"][0], flags=re.M) != re.sub(rb'^PI_VERSION="[^"]+"$', b'PI_VERSION="PIN"', after["install.sh"][0], flags=re.M):
        raise Rejected("installer behavior changed")
    patched = manifest.get("patchedPackages", [])
    if [p["package"] for p in patched] != [p["package"] for p in original["patchedPackages"]]:
        raise Rejected("patch contract removed or added")
    for item, previous in zip(patched, original["patchedPackages"]):
        name = item["package"]
        version = targets[name]
        if set(item) != set(previous):
            raise Rejected("patch metadata schema changed")
        files = item.get("files", [])
        if not files or any(not isinstance(p, str) or Path(p).is_absolute() or ".." in Path(p).parts or ".git" in Path(p).parts for p in files):
            raise Rejected("unsafe patch target path")
        if item.get("version") != version or item.get("pinRequired") != previous.get("pinRequired"):
            raise Rejected("patch pin mismatch")
        if item.get("patch") != f"patches/{name.replace('/', '+')}+{version}.patch" or item["patch"] not in after:
            raise Rejected("missing versioned patch")
        if previous.get("settingsSpec") and item.get("settingsSpec") != f"npm:{name}@{version}":
            raise Rejected("settings pin mismatch")


def read_oauth(home):
    path = home
    for part in [".pi", "agent", "auth.json"]:
        path = path / part
        info = path.lstat()
        if stat.S_ISLNK(info.st_mode) or (part != "auth.json" and not stat.S_ISDIR(info.st_mode)):
            raise Rejected("unsafe OAuth path")
    if not stat.S_ISREG(info.st_mode) or info.st_size > 65536:
        raise Rejected("unsafe OAuth file")
    document = json.loads(path.read_text())
    credential = document.get("openai", {})
    if set(document) != {"openai"} or credential.get("type") != "oauth" or not all(isinstance(credential.get(k), str) and len(credential[k]) > 12 for k in ["access", "refresh"]) or not isinstance(credential.get("expires"), (int, float)):
        raise Rejected("invalid subscription credential")
    if not isinstance(credential.get("clientId"), str) or not credential["clientId"] or not isinstance(credential.get("scopes"), list) or "chatgpt.tokens.use.direct" not in credential["scopes"] or not all(isinstance(s, str) for s in credential["scopes"]) or not math.isfinite(credential["expires"]):
        raise Rejected("subscription requires a new ChatGPT direct-access login")
    return {"openai": {k: v for k, v in credential.items() if k in {"type", "access", "refresh", "expires", "clientId", "scopes"}}}


def ci_result(payload, sha, branch):
    runs = [r for r in payload.get("workflow_runs", []) if r.get("head_sha") == sha and r.get("head_branch") == branch and r.get("event") == "push"]
    if not runs:
        return "pending"
    run = max(runs, key=lambda r: (r.get("id", 0), r.get("run_attempt", 0)))
    if run.get("status") != "completed":
        return "pending"
    return "success" if run.get("conclusion") == "success" else "failure"


def can_publish(current, base, result):
    return current == base and result == "success"


def next_action(state, fingerprint):
    if state.get("pending"):
        return "resume"
    return "exhausted" if state.get("attempts", {}).get(fingerprint, 0) >= 3 else "repair"


def atomic_json(path, data):
    temporary = path.with_suffix(".tmp")
    with temporary.open("w") as stream:
        os.chmod(temporary, 0o600)
        json.dump(data, stream, indent=2)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)
    fd = os.open(path.parent, os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def sandbox_command(config, role, work, home, command, unit, timeout):
    properties = ["ProtectHome=yes", "ProtectSystem=strict", "NoNewPrivileges=yes", "TemporaryFileSystem=/tmp:rw,size=512M,mode=1777 /var/tmp:rw,size=512M,mode=1777", "PrivateDevices=yes", "ProtectKernelTunables=yes", "ProtectKernelModules=yes", "ProtectControlGroups=yes", "RestrictSUIDSGID=yes", "CapabilityBoundingSet=", "KillMode=control-group", "MemoryMax=3G", "TasksMax=256", "LimitFSIZE=64M", "CPUQuota=150%", f"RuntimeMaxSec={timeout}", "PartOf=my-pi-updater.service", f"ReadWritePaths={work} {home}", "UMask=0077"]
    properties += ["InaccessiblePaths=" + config["auth_home"]]
    return ["systemd-run", "--quiet", "--wait", "--pipe", "--unit=" + unit, "--uid=pi-update-" + role, "--working-directory=" + str(work), *["--property=" + p for p in properties], "/usr/bin/env", "-i", "HOME=" + str(home), "PATH=" + config["node"] + ":/usr/bin:/bin", "LANG=C.UTF-8", "OPENSPEC_TELEMETRY=0", "NPM_CONFIG_UPDATE_NOTIFIER=false", "NPM_CONFIG_CACHE=" + str(work / ".cache/npm"), *command]


def fetch_json(url):
    request = urllib.request.Request(url, headers={"User-Agent": "my-pi-updater", "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


class Updater:
    def __init__(self, config):
        self.config = config
        self.state_dir = Path(config["state"])
        self.repo = self.state_dir / "repo"
        self.state_path = self.state_dir / "state.json"
        self.state = json.loads(self.state_path.read_text()) if self.state_path.exists() else {"attempts": {}, "outbox": []}

    def save(self):
        atomic_json(self.state_path, self.state)

    def git(self, *args):
        result = subprocess.run(["git", "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "-C", str(self.repo), *args], capture_output=True, text=True, timeout=120, env={"HOME": "/root", "PATH": "/usr/bin:/bin", "GIT_TERMINAL_PROMPT": "0", "GIT_SSH_COMMAND": "ssh -o BatchMode=yes -o ForwardAgent=no -o StrictHostKeyChecking=yes"})
        if result.returncode:
            raise Rejected("trusted Git operation failed: " + args[0])
        return result.stdout.strip()

    def notify(self, text):
        if text not in self.state["outbox"]:
            self.state["outbox"].append(text)
        self.save()
        self.flush_notifications()

    def flush_notifications(self):
        while self.state["outbox"]:
            try:
                result = subprocess.run([self.config["hermes"], "send", "--quiet", "--to", "telegram", "--file", "-"], input=self.state["outbox"][0], text=True, capture_output=True, timeout=45, env={"HOME": "/root", "PATH": "/usr/local/bin:/usr/bin:/bin"})
            except (OSError, subprocess.TimeoutExpired):
                return
            if result.returncode:
                return
            self.state["outbox"].pop(0)
            self.save()

    def baseline(self):
        if not self.repo.exists():
            self.repo.mkdir()
            self.git("init")
            self.git("remote", "add", "origin", self.config["repository"])
            self.git("config", "user.name", "my_pi updater")
            self.git("config", "user.email", "pi-updater@users.noreply.github.com")
        self.git("fetch", "origin", "main")
        base = self.git("rev-parse", "FETCH_HEAD")
        self.git("checkout", "--detach", "--force", base)
        self.git("clean", "-ffd")
        return base, read_tree(self.repo)

    def remote_main(self):
        value = self.git("ls-remote", "origin", "refs/heads/main").split()
        if len(value) != 2 or not re.fullmatch(r"[a-f0-9]{40}", value[0]):
            raise Rejected("cannot determine remote main")
        return value[0]

    def sandbox(self, role, work, home, command, log, timeout):
        unit = "my-pi-worker-" + role + "-" + str(os.getpid())
        args = sandbox_command(self.config, role, work, home, command, unit, timeout)
        result = None
        timed_out = False
        try:
            with log.open("wb") as stream:
                os.fchmod(stream.fileno(), 0o600)
                try:
                    result = subprocess.run(args, stdout=stream, stderr=subprocess.STDOUT, timeout=timeout + 60,
                                            preexec_fn=lambda: resource.setrlimit(resource.RLIMIT_FSIZE, (64 * 1024 ** 2, 64 * 1024 ** 2)))
                except subprocess.TimeoutExpired:
                    timed_out = True
        finally:
            try:
                fields = {}
                available = False
                try:
                    status = subprocess.run(["systemctl", "show", unit, "-p", "Result", "-p", "ExecMainCode", "-p", "ExecMainStatus"], capture_output=True, text=True, timeout=10)
                    available = status.returncode == 0
                    if available:
                        fields = dict(line.split("=", 1) for line in status.stdout.splitlines() if "=" in line)
                except (OSError, subprocess.TimeoutExpired):
                    pass
                known_results = {"success", "exit-code", "signal", "core-dump", "timeout", "oom-kill", "watchdog", "resources", "protocol", "start-limit-hit", "exec-condition"}
                code, value = fields.get("ExecMainCode", ""), fields.get("ExecMainStatus", "")
                metadata = {
                    "launcherReturncode": result.returncode if result is not None else None,
                    "timedOut": timed_out, "logBytes": log.stat().st_size if log.exists() else 0,
                    "workerStatusAvailable": available,
                    "workerResult": fields.get("Result") if fields.get("Result") in known_results else "unknown",
                    "workerCode": int(code) if code in {"0", "1", "2", "3"} else None,
                    "workerStatus": int(value) if re.fullmatch(r"[0-9]{1,3}", value) and int(value) <= 255 else None,
                }
                atomic_json(log.with_suffix(".status.json"), metadata)
            finally:
                try:
                    subprocess.run(["systemctl", "stop", unit], capture_output=True, timeout=30)
                finally:
                    subprocess.run(["systemctl", "reset-failed", unit], capture_output=True, timeout=30)
        worker_failed = metadata["workerResult"] not in {"success", "unknown"} or metadata["workerCode"] in {2, 3} or (metadata["workerCode"] == 1 and bool(metadata["workerStatus"]))
        if timed_out or result.returncode or worker_failed:
            worker_signal = metadata["workerCode"] in {2, 3} and bool(metadata["workerStatus"])
            if timed_out:
                reason = "controller deadline"
            elif metadata["workerResult"] in {"timeout", "oom-kill"}:
                reason = "worker " + metadata["workerResult"]
            elif worker_signal or result.returncode < 0:
                number = metadata["workerStatus"] if worker_signal else -result.returncode
                try:
                    name = signal.Signals(number).name
                except ValueError:
                    name = str(number)
                reason = ("worker" if worker_signal else "launcher") + " signal " + name
                if number == signal.SIGXFSZ:
                    reason += " (per-file size limit)"
            elif metadata["workerCode"] == 1 and metadata["workerStatus"]:
                reason = "worker exit " + str(metadata["workerStatus"])
            else:
                reason = "worker " + metadata["workerResult"] if worker_failed else "launcher exit " + str(result.returncode)
            raise Rejected(role + " sandbox failed: " + reason + "; private diagnostics retained")

    @staticmethod
    def copy_tree(tree, destination, user):
        destination.mkdir(parents=True)
        identity = pwd.getpwnam(user)
        for name, (content, executable) in tree.items():
            path = destination / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
            path.chmod(0o700 if executable else 0o600)
        for directory, dirs, files in os.walk(destination):
            os.chown(directory, identity.pw_uid, identity.pw_gid)
            os.chmod(directory, 0o700)
            for name in files:
                os.chown(Path(directory) / name, identity.pw_uid, identity.pw_gid)

    def resume(self):
        pending = self.state["pending"]
        # A completed merge followed by a crash must not cause another model run.
        if self.remote_main() != pending["sha"]:
            url = f'https://api.github.com/repos/{self.config["github_repo"]}/actions/workflows/test.yml/runs?' + urllib.parse.urlencode({"head_sha": pending["sha"], "event": "push", "per_page": 10})
            deadline = time.monotonic() + 1200
            while True:
                result = ci_result(fetch_json(url), pending["sha"], pending["branch"])
                if result != "pending" or time.monotonic() >= deadline:
                    break
                time.sleep(45)
            if result == "pending":
                raise Rejected("GitHub Actions pending; will resume next run")
            if not can_publish(self.remote_main(), pending["base"], result):
                del self.state["pending"]
                self.save()
                raise Rejected("CI failed or main advanced; no merge")
            if self.git("rev-parse", pending["sha"] + "^") != pending["base"]:
                raise Rejected("candidate is not a direct child of the tested base")
            # Lease is compare-and-swap, not permission to rewrite: parent == base above.
            self.git("push", "--force-with-lease=refs/heads/main:" + pending["base"], "origin", pending["sha"] + ":refs/heads/main")
        del self.state["pending"]
        self.state["last_success"] = pending
        self.state["attempts"].pop(pending["fingerprint"], None)
        self.save()
        self.notify("my_pi: обновление проверено и слито в main.\nhttps://github.com/" + self.config["github_repo"] + "/commit/" + pending["sha"] + "\nVPS gate + GitHub Actions: PASS. Рабочие установки не менялись.")

    def cleanup(self):
        subprocess.run(["systemctl", "stop", "my-pi-worker-*.service"], capture_output=True, timeout=60)
        subprocess.run(["systemctl", "reset-failed", "my-pi-worker-*.service"], capture_output=True, timeout=30)
        for job in Path(self.config["jobs"]).iterdir():
            if not re.fullmatch(r"run-[a-z0-9_]+", job.name) or job.is_symlink() or not job.is_dir():
                raise Rejected("unexpected job cleanup path")
            mounted = subprocess.run(["mountpoint", "-q", str(job)], timeout=10).returncode == 0
            if mounted:
                subprocess.run(["umount", str(job)], check=True, capture_output=True, timeout=30)
            shutil.rmtree(job)

    def run(self, check_only=False):
        self.flush_notifications()
        if self.state.get("pending"):
            if not check_only:
                self.resume()
            return {"status": "pending"}
        base, before = self.baseline()
        current = json.loads(before["npm/package.json"][0])["dependencies"]
        latest = {name: fetch_json("https://registry.npmjs.org/" + urllib.parse.quote(name, safe="") + "/latest")["version"] for name in current}
        targets = choose_targets(current, latest)
        fingerprint = hashlib.sha256(json.dumps([base, targets], sort_keys=True).encode()).hexdigest()
        report = {"base": base, "updates": {k: v for k, v in targets.items() if v != current[k]}, "fingerprint": fingerprint}
        atomic_json(self.state_dir / "latest-check.json", report)
        if check_only or targets == current or next_action(self.state, fingerprint) == "exhausted":
            return report
        if shutil.disk_usage(self.config["jobs"]).free < 6 * 1024 ** 3:
            raise Rejected("less than 6 GiB free; no repair started")
        self.state["attempts"][fingerprint] = self.state["attempts"].get(fingerprint, 0) + 1
        self.save()
        job = Path(tempfile.mkdtemp(prefix="run-", dir=self.config["jobs"]))
        job.chmod(0o711)
        logs = self.state_dir / "logs"
        logs.mkdir(exist_ok=True)
        for old in sorted(logs.glob("*.log"), key=lambda p: p.stat().st_mtime)[:-4]:
            old.with_suffix(".status.json").unlink(missing_ok=True)
            old.unlink()
        log_name = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        mounted = False
        try:
            subprocess.run(["mount", "-t", "tmpfs", "-o", "size=2G,nosuid,nodev,mode=0711", "tmpfs", str(job)], check=True, capture_output=True, timeout=30)
            mounted = True
            work = job / "repair"
            repair_tree = dict(before)
            repair_tree["configs/settings.json"] = settings_for_targets(before, targets)
            self.copy_tree(repair_tree, work, "pi-update-agent")
            auth_path = Path(self.config["auth_home"]) / ".pi/agent/auth.json"
            auth = read_oauth(Path(self.config["auth_home"]))
            home = job / "agent-home"
            self.copy_tree({".pi/agent/auth.json": (json.dumps(auth).encode(), False)}, home, "pi-update-agent")
            change = "openspec/changes/archive/" + dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d") + "-autoupdate-" + fingerprint[:12] + "/"
            prompt = ("Update this Pi build without adding features. User authorizes npm/GitHub read access and Codex subscription only, never paid API keys. "
                      "Preserve all existing local contracts. Work only here. Read AGENTS.md first; run npm/OpenSpec here. Do not deploy or push. "
                      "No personal settings, credentials, sessions or logs in source. The controller handles Git commits and acceptance. "
                      "Protected: tests/, scripts/, configs/, .github/, AGENTS.md, root package files, existing OpenSpec specs/history. "
                      "The controller already synchronized existing exact npm pins in configs/settings.json to targets; leave that prepared file unchanged. "
                      "Allowed: npm exact pins/lock (same package names/scripts/allowScripts), manifest release/patch metadata (same managed configs), "
                      "installer PI_VERSION line only, versioned patches, local-extensions, README/docs Markdown. "
                      "Create proposal/design/tasks/spec delta/evidence using OpenSpec, archive only after full npm test PASS into " + change + ". "
                      "Do not weaken tests or patch away required behavior. If protected changes are required, explain and stop. "
                      "Use npm ci --ignore-scripts --legacy-peer-deps; never enable new lifecycle scripts. "
                      "Targets (all must match exactly): " + json.dumps(targets, sort_keys=True))
            try:
                self.sandbox("agent", work, home, [str(Path(self.config["node"]) / "node"), self.config["pi_cli"], "--mode", "json", "--offline", "--no-session", "--no-extensions", "--no-skills", "--no-prompt-templates", "--no-themes", "--no-context-files", "--no-mcp", "--model", self.config["model"], "--thinking", "medium", prompt], logs / (log_name + "-agent.log"), 2700)
            finally:
                refreshed = read_oauth(home)
                atomic_json(auth_path, refreshed)
            secrets = [v.encode() for document in [auth, refreshed] for entry in document.values() for key, v in entry.items() if key in {"access", "refresh"} and isinstance(v, str) and len(v) > 12]
            after = read_tree(work)
            check_scope(before, after, change)
            check_pins(before, after, targets)
            for required in ["proposal.md", "tasks.md", "evidence.md"]:
                if change + required not in after:
                    raise Rejected("missing archived OpenSpec evidence")
            if b"- [ ]" in after[change + "tasks.md"][0]:
                raise Rejected("unfinished OpenSpec tasks")
            if any(secret in content for content, _ in after.values() for secret in secrets):
                raise Rejected("credential bytes in candidate")
            shutil.rmtree(work)
            shutil.rmtree(home)
            gate = job / "gate"
            self.copy_tree(after, gate, "pi-update-test")
            home = job / "test-home"
            self.copy_tree({}, home, "pi-update-test")
            self.sandbox("test", gate, home, ["/bin/bash", self.config["gate"]], logs / (log_name + "-gate.log"), 900)
            if read_tree(gate) != after:
                raise Rejected("gate mutated candidate source")
            for path in before.keys() - after.keys():
                (self.repo / path).unlink()
            for path, (content, executable) in after.items():
                if before.get(path) == after[path]:
                    continue
                destination = self.repo / path
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(content)
                destination.chmod(0o755 if executable else 0o644)
            self.git("add", "--all")
            self.git("diff", "--cached", "--check")
            self.git("commit", "-m", "chore: checked Pi stack update " + fingerprint[:12])
            sha = self.git("rev-parse", "HEAD")
            branch = "automation/pi-update-" + log_name.lower() + "-" + fingerprint[:8]
            self.git("push", "origin", sha + ":refs/heads/" + branch)
            self.state["pending"] = {"base": base, "sha": sha, "branch": branch, "fingerprint": fingerprint}
            self.save()
            self.resume()
            return report
        finally:
            if mounted:
                subprocess.run(["umount", str(job)], check=True, capture_output=True, timeout=30)
            shutil.rmtree(job)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["run", "check", "cleanup"])
    parser.add_argument("--config", default="/etc/my-pi-updater/config.json")
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text())
    state_dir = Path(config["state"])
    state_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (state_dir / "run.lock").open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print("Another updater run is active")
            return 0
        updater = Updater(config)
        try:
            if args.action == "cleanup":
                updater.cleanup()
                return 0
            print(json.dumps(updater.run(check_only=args.action == "check"), ensure_ascii=False))
            return 0
        except Exception as error:
            # Never forward subprocess/model output to Telegram or the journal.
            message = str(error) if isinstance(error, Rejected) else type(error).__name__
            print("Updater stopped: " + message, file=sys.stderr)
            if args.action == "run":
                updater.notify("my_pi: автоматический этап не завершён. Причина: " + message + ". Подробности: приватные логи VPS.")
            return 1


if __name__ == "__main__":
    raise SystemExit(main())
