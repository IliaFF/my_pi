#!/usr/bin/env python3
"""Run the same isolated regression gate locally, in CI, and after an update."""
import argparse
import json
import os
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run_check(name, stage, args, *, env, output, timeout=120):
    started = time.monotonic()
    result = {"name": name, "stage": stage, "command": list(map(str, args))}
    log = output / f"{name}.log"
    with log.open("w") as stream:
        try:
            with subprocess.Popen(args, cwd=ROOT, env=env, stdout=stream,
                                  stderr=subprocess.STDOUT, start_new_session=True) as child:
                try:
                    result["exitCode"] = child.wait(timeout=timeout)
                except subprocess.TimeoutExpired:
                    try:
                        os.killpg(child.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                    child.wait()
                    result.update(exitCode=124, error=f"timeout after {timeout}s")
        except OSError as error:
            result.update(exitCode=127, error=str(error))
    result.update(elapsedSeconds=round(time.monotonic() - started, 3), log=str(log.relative_to(output)))
    result["passed"] = result["exitCode"] == 0
    return result


def main():
    """Validate contracts and run isolated unit, SDK and startup checks."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--agent", type=Path, help="Check installed dependencies read-only instead of repository test dependencies")
    args = parser.parse_args()
    output = ROOT / "test-results"
    output.mkdir(exist_ok=True)
    manifest = json.loads((ROOT / "manifest.json").read_text())
    dependencies = json.loads((ROOT / "npm/package.json").read_text())["dependencies"]
    modules = (args.agent / "npm/node_modules" if args.agent else ROOT / "npm/node_modules").resolve()
    versions = {}
    failures = []
    for name, expected in dependencies.items():
        path = modules / name / "package.json"
        actual = json.loads(path.read_text())["version"] if path.is_file() else None
        versions[name] = actual
        if actual != expected:
            failures.append(f"{name}: expected {expected}, actual {actual}")
    tooling = json.loads((ROOT / "package.json").read_text())["devDependencies"]
    for name, expected in tooling.items():
        path = ROOT / "node_modules" / name / "package.json"
        actual = json.loads(path.read_text())["version"] if path.is_file() else None
        versions[name] = actual
        if actual != expected:
            failures.append(f"tooling {name}: expected {expected}, actual {actual}")
    report = {"schemaVersion": 1, "expectedCoreVersion": manifest["piCoreVersion"],
              "nodeVersion": subprocess.check_output(["node", "--version"], text=True).strip(),
              "pythonVersion": sys.version.split()[0], "versions": versions, "checks": []}
    revision = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT,
                              capture_output=True, text=True, check=False)
    report["revision"] = revision.stdout.strip() if revision.returncode == 0 else None

    def save():
        report["passed"] = not failures and all(c["passed"] for c in report["checks"])
        report["setupErrors"] = failures
        (output / "results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")

    if failures:
        save()
        if args.agent:
            print("FAIL installed dependencies differ from source lock; no host files changed. Diagnose before reinstalling.")
        else:
            print("FAIL dependencies; run npm ci --ignore-scripts, then npm ci --ignore-scripts --legacy-peer-deps --prefix npm")
        print("\n".join(failures))
        return 1
    core = modules / "@earendil-works/pi-coding-agent"
    with tempfile.TemporaryDirectory(prefix="pi-build-tests-") as temp:
        temp = Path(temp)
        agent = temp / "agent"
        agent.mkdir(mode=0o700)
        (agent / "npm").mkdir()
        (agent / "npm/node_modules").symlink_to(modules, target_is_directory=True)
        for item in manifest["managedConfigs"]:
            target = agent / item["source"]
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((ROOT / item["snapshot"]).read_bytes())
        # No configured MCP transports in mandatory tests: Chrome/SSH require separate live approval.
        (agent / "mcp.json").write_text('{"mcpServers": {}}\n')
        (agent / "my-pi-settings.json").write_text(json.dumps({"version": 1, "packages": {
            "context": json.loads((ROOT / "configs/pi-context.json").read_text())}}))
        home = temp / "home"
        home.mkdir(mode=0o700)
        # pine-of-glass reads user config via HOME/.pi/agent, not PI_CODING_AGENT_DIR.
        (home / ".pi").mkdir(mode=0o700)
        (home / ".pi/agent").symlink_to(agent, target_is_directory=True)
        env = {key: os.environ[key] for key in ("PATH", "LANG", "LC_ALL", "TERM", "SYSTEMROOT") if key in os.environ}
        env.update(HOME=str(home), XDG_CONFIG_HOME=str(home / ".config"), PI_CODING_AGENT_DIR=str(agent),
                   PI_CODING_AGENT_CORE_DIR=str(core), PI_OFFLINE="1", OPENSPEC_TELEMETRY="0", PI_TEST_OFFLINE="1",
                   NODE_OPTIONS="--unhandled-rejections=strict")
        env["PATH"] = os.pathsep.join([str(modules / ".bin"), str(ROOT / "node_modules/.bin"), env.get("PATH", "")])

        def check(name, stage, command, **options):
            result = run_check(name, stage, command, env=env, output=output, **options)
            report["checks"].append(result)
            save()
            print(f"{'PASS' if result['passed'] else 'FAIL'} {stage}/{name}: exit={result['exitCode']} ({result['elapsedSeconds']}s)", flush=True)
            if not result["passed"]:
                print((output / result["log"]).read_text()[-8000:], flush=True)
            return result["passed"]

        check("openspec", "contract", ["openspec", "validate", "--all", "--strict", "--no-interactive"])
        check("ci-config", "contract", ["node", "scripts/test-ci-config.mjs"])
        check("harness", "unit", [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "*_test.py"])
        check("release", "unit", [sys.executable, "scripts/test-release.py", str(ROOT)], timeout=180)
        check("loop-pilot", "unit", ["node", "scripts/test-loop-pilot.mjs", "local-extensions/loop-profiler.ts"])
        check("queue-checks", "unit", ["node", "--test", "scripts/test-queue-checks.mjs"], timeout=30)
        if args.agent:
            host_env = dict(env, PI_CODING_AGENT_DIR=str(args.agent.resolve()))
            result = run_check("host-drift", "integration", [sys.executable, "scripts/maintenance.py", "verify"], env=host_env, output=output)
            report["checks"].append(result)
            save()
            print(f"{'PASS' if result['passed'] else 'FAIL'} integration/host-drift: see test-results/host-drift.log", flush=True)
            ready = check("patch-verify", "integration", [sys.executable, "scripts/maintenance.py", "verify"])
        else:
            ready = check("patch-apply", "integration", [sys.executable, "scripts/maintenance.py", "apply"])
            ready = check("patch-verify", "integration", [sys.executable, "scripts/maintenance.py", "verify"]) and ready
        if ready:
            check("context-fold-index", "integration", ["node", "--require", "./scripts/no-network.cjs", "scripts/test-context-fold-index.mjs", str(modules)], timeout=30)
            check("stack-surface", "integration", ["node", "scripts/test-stack-surface.mjs", str(agent)])
            check("native-quota-sdk", "integration", ["node", "--require", "./scripts/no-network.cjs", "scripts/test-native-quota-sdk.mjs", str(modules)], timeout=30)
            check("deferred-tools-sdk", "integration", ["node", "--require", "./scripts/no-network.cjs", "scripts/test-deferred-tools-sdk.mjs", str(modules)], timeout=60)
            check("train-agents", "integration", ["node", "scripts/test-train-agents.mjs", str(agent)])
            check("queue-sdk", "integration", ["node", "--require", "./scripts/no-network.cjs", "scripts/test-todo-queue-sdk.mjs", str(modules)], timeout=60)
            check("queue-checks-sdk", "integration", ["node", "--require", "./scripts/no-network.cjs", "scripts/test-queue-checks-sdk.mjs", str(modules)], timeout=60)
            check("task-session-sdk", "integration", ["node", "--require", "./scripts/no-network.cjs", "scripts/test-task-session-sdk.mjs", str(modules)], timeout=60)
            check("herdr-ipc-sdk", "integration",
                  ["node", "--require", "./scripts/no-network.cjs",
                   "scripts/test-herdr-ipc-sdk.mjs", str(modules)], timeout=60)
            check("ponytail-sdk", "integration", ["node", "--require", "./scripts/no-network.cjs", "scripts/test-ponytail-sdk.mjs", str(modules)], timeout=60)
            check("background-jobs", "integration", ["node", "scripts/test-background-jobs.mjs", str(modules)], timeout=60)
            check("loop-sdk", "integration", ["node", "scripts/test-loop-profiler-sdk.mjs", str(core)])
            check("context-runtime", "integration", ["node", "scripts/test-pi-context-runtime.mjs", str(modules / "@spences10/pi-context"), str(temp / "context-probe")])
            check("rpc-startup", "smoke", ["node", "scripts/test-rpc-startup.mjs", str(agent)], timeout=60)
        else:
            report["skipped"] = "Package patch gate failed: integration/startup cannot be trusted"
            save()
    save()
    print(f"{'PASS' if report['passed'] else 'FAIL'} build; report: test-results/results.json")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
