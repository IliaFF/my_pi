#!/usr/bin/env python3
"""Validate release structure and replay every patch on pristine npm archives."""

from __future__ import annotations

import hashlib
import io
import json
import re
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent).resolve()


def fail(message: str) -> None:
    raise RuntimeError(message)


def tarball(package: str, version: str) -> bytes:
    quoted = package.replace("/", "%2f")
    with urllib.request.urlopen(f"https://registry.npmjs.org/{quoted}/{version}", timeout=30) as response:
        metadata = json.load(response)
    with urllib.request.urlopen(metadata["dist"]["tarball"], timeout=60) as response:
        return response.read()


def extract_package(data: bytes, destination: Path) -> None:
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
        members = archive.getmembers()
        for member in members:
            path = Path(member.name)
            if path.is_absolute() or ".." in path.parts:
                fail(f"unsafe npm archive member: {member.name}")
        archive.extractall(destination, members=members, filter="data")


def main() -> int:
    manifest = json.loads((ROOT / "manifest.json").read_text())
    if manifest.get("piCoreVersion") != "0.84.1":
        fail("unexpected Pi core version")
    if manifest.get("nodeMinimum") != "24.0.0":
        fail("pi-fabric requires Node >=24")
    package_json = json.loads((ROOT / "npm/package.json").read_text())
    package_lock = json.loads((ROOT / "npm/package-lock.json").read_text())
    root_lock = package_lock["packages"][""]
    if package_json["dependencies"] != root_lock["dependencies"]:
        fail("package.json and package-lock.json root dependencies differ")
    for package, version in package_json["dependencies"].items():
        locked = package_lock["packages"].get(f"node_modules/{package}", {}).get("version")
        if locked != version or not re.fullmatch(r"\d+\.\d+\.\d+(?:[-+].+)?", version):
            fail(f"dependency is not exactly locked: {package} expected={version} locked={locked}")

    for item in manifest["managedConfigs"]:
        snapshot = ROOT / item["snapshot"]
        if not snapshot.is_file():
            fail(f"missing snapshot: {item['snapshot']}")
        if snapshot.suffix == ".json":
            json.loads(snapshot.read_text())
    if package_json["dependencies"].get("pi-fabric") != "0.50.2":
        fail("pi-fabric is not exactly pinned")
    fabric_lock = package_lock["packages"].get("node_modules/pi-fabric", {})
    if fabric_lock.get("version") != "0.50.2" or fabric_lock.get("integrity") != "sha512-FNPq+6wSML3Nks2N65mDpaRTkc2UT6YahaC/Mhk1wSEcpxpWagIXIihyzhX8gYegnCqWMJmHqBmLxVaxxUZjuQ==":
        fail("unexpected pi-fabric lock identity")
    fabric = json.loads((ROOT / "configs/fabric.json").read_text())
    required_fabric = {
        ("configVersion",): 3,
        ("fullCodeMode",): True,
        ("executor", "runtime"): "quickjs",
        ("compaction", "engine"): "pi",
        ("mcp", "enabled"): False,
        ("agents", "enabled"): False,
        ("agents", "maxDepth"): 0,
        ("mesh", "enabled"): False,
        ("memory", "enabled"): False,
        ("schema", "mode"): "off",
        ("capture", "hideFromModel"): True,
        ("capture", "keepVisible"): ["fabric_exec", "ask_user_question", "context_recall"],
    }
    for keys, expected in required_fabric.items():
        value = fabric
        for key in keys:
            value = value.get(key) if isinstance(value, dict) else None
        if value != expected:
            fail(f"unsafe Fabric config: {'.'.join(keys)} expected={expected!r} actual={value!r}")
    routing_source = (ROOT / "local-extensions/tools.ts").read_text()
    if 'const STABLE_TOOLS = ["fabric_exec"] as const;' not in routing_source:
        fail("fabric_exec-only stable tool default missing")
    if "const ROUTES" in routing_source or "routePrompt(" in routing_source or 'registerTool({' in routing_source:
        fail("legacy dynamic tool routing still present")
    if 'pi.on("before_agent_start"' in routing_source or 'pi.on("agent_start"' in routing_source:
        fail("tools extension must not reset active tools between turns")
    if (ROOT / "local-extensions/lean-tools.ts").exists():
        fail("legacy lean-tools extension still present")
    todo_source = (ROOT / "local-extensions/todo-queue/index.ts").read_text()
    for required in ['registerCommand("queue"', 'name: "task_queue"', 'pi.on("agent_settled"']:
        if required not in todo_source:
            fail(f"todo-queue wiring missing: {required}")
    terminal = json.loads((ROOT / "windows-terminal/settings.json").read_text())
    background = terminal.get("profiles", {}).get("defaults", {}).get("backgroundImage", "")
    if not background.startswith("%USERPROFILE%") or "C:\\Users\\" in background:
        fail("Windows Terminal background path is not portable")
    image = ROOT / "windows-terminal/catppuccin-mocha-blur.jpg"
    if not image.is_file() or hashlib.sha256(image.read_bytes()).hexdigest() != "f2cefea8de06d1abdabb29248e2405aed0708b87d4504d33bec9f12edfcc4098":
        fail("Windows Terminal background asset mismatch")

    decision_source = (ROOT / "local-extensions/decision-observer.ts").read_text()
    decision_example = json.loads((ROOT / "configs/decision-observability.example.json").read_text())
    if "registerTool" in decision_source or any(f'pi.on("{event}"' in decision_source for event in ["input", "context", "before_provider_request", "tool_execution_end", "message_update"]):
        fail("decision observer exposes a model tool or content-bearing event hook")
    if decision_example.get("enabled") is not False or decision_example.get("mode") != "structured-markers":
        fail("decision observer example must remain explicit opt-in structured-marker mode")
    if any(decision_example.get(key) is not False for key in ["captureToolOutput", "captureMessages", "capturePrompts"]):
        fail("decision observer privacy defaults changed")
    reader_source = (ROOT / "local-extensions/reader-pane.ts").read_text()
    for required in ["export function adaptWideTables", "adaptWideTables(text, WIDTH)", 'registerCommand("reader-pane-on"', 'registerCommand("reader-pane-off"']:
        if required not in reader_source:
            fail(f"reader pane wiring missing: {required}")

    removed_names = ["project_context", "project_probe", "edit_verify", "targeted_test", "finish_gate", "fast-fix"]
    removed_paths = [ROOT / "local-extensions/project-loop.ts", ROOT / "configs/project-loop.schema.json", ROOT / "configs/project-loop.example.json"]
    if any(path.exists() for path in removed_paths) or any(name in routing_source for name in removed_names):
        fail("legacy project-loop surface still present")

    for settings_file in [ROOT / "configs/settings.json"]:
        settings = json.loads(settings_file.read_text())
        for spec in settings.get("packages", []):
            source = spec if isinstance(spec, str) else spec.get("source", "")
            if not source.startswith("npm:"):
                continue
            raw = source.removeprefix("npm:")
            package = raw.rsplit("@", 1)[0] if (raw.startswith("@") and raw.count("@") > 1) or (not raw.startswith("@") and "@" in raw) else raw
            if package not in package_json["dependencies"]:
                fail(f"settings package absent from exact lock: {source} in {settings_file.relative_to(ROOT)}")
        pine = next((spec for spec in settings.get("packages", []) if isinstance(spec, dict) and spec.get("source") == "npm:pine-of-glass@0.10.1"), None)
        required_pine = {"extensions/pi-contextimate/**", "extensions/pi-traceline/**", "extensions/pi-cachemire/**"}
        if pine is None or set(pine.get("extensions", [])) != required_pine:
            fail("pine-of-glass observability extension selection mismatch")
        active_sources = {spec if isinstance(spec, str) else spec.get("source", "") for spec in settings.get("packages", [])}
        if any(source.startswith("npm:pi-canary") for source in active_sources):
            fail("pi-canary must remain installed but disabled")
    readme = (ROOT / "README.md").read_text()
    for package in package_json["dependencies"]:
        if ("`" + package + "`") not in readme:
            fail(f"README extension inventory missing: {package}")
    for required in [
        "## Текущие packages и расширения",
        "### Локальные extensions",
        "### Что отключено и почему",
        'compaction.engine: "pi"',
        "Fabric agents/RLM/councils",
        "Legacy project-loop",
        "## Decision observability",
        "decision-observer.ts",
    ]:
        if required not in readme:
            fail(f"README extension status documentation missing: {required}")
    print("PASS README extension inventory and disabled-component rationale")
    forbidden_path = re.compile(r"(^|/)(auth\.json|sessions|recovery|context-store|logs?|mcp-cache(?:\.json)?)($|/)")
    secret_content = re.compile(r"(BEGIN [A-Z ]*PRIVATE KEY|(?:^|[^A-Za-z0-9])sk-[A-Za-z0-9_-]{16,})")
    for path in ROOT.rglob("*"):
        if ".git" in path.parts or not path.is_file():
            continue
        if forbidden_path.search(path.relative_to(ROOT).as_posix()):
            fail(f"forbidden path in release: {path.relative_to(ROOT)}")
        try:
            text = path.read_text()
        except UnicodeDecodeError:
            continue
        if secret_content.search(text):
            fail(f"possible secret in: {path.relative_to(ROOT)}")

    with tempfile.TemporaryDirectory(prefix="my-pi-test-") as temp:
        temp_path = Path(temp)
        for item in manifest["patchedPackages"]:
            destination = temp_path / re.sub(r"[^A-Za-z0-9_.-]", "_", item["package"])
            destination.mkdir()
            extract_package(tarball(item["package"], item["version"]), destination)
            root = destination / "package"
            patch = ROOT / item["patch"]
            result = subprocess.run(
                ["patch", "--batch", "--silent", "-p1", "-d", str(root)],
                stdin=patch.open(),
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
            )
            if result.returncode:
                fail(f"patch replay failed for {item['package']}: {result.stdout.strip()}")
            reverse = subprocess.run(
                ["patch", "--batch", "--silent", "--dry-run", "--reverse", "-p1", "-d", str(root)],
                stdin=patch.open(),
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
            )
            if reverse.returncode:
                fail(f"reverse patch check failed for {item['package']}: {reverse.stdout.strip()}")
            print(f"PASS patch {item['package']}@{item['version']}")

    compaction_test = subprocess.run(
        ["node", str(ROOT / "scripts/test-auto-ultra-compact.mjs"), str(ROOT)],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if compaction_test.returncode:
        fail(f"auto-ultra-compact test failed: {compaction_test.stdout.strip()}")
    print(compaction_test.stdout.strip())

    profiler_test = subprocess.run(
        ["node", str(ROOT / "scripts/test-loop-profiler.mjs")],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if profiler_test.returncode:
        fail(f"loop profiler test failed: {profiler_test.stdout.strip()}")
    print(profiler_test.stdout.strip())

    fabric_output_test = subprocess.run(
        ["node", str(ROOT / "local-extensions/fabric-output/core.test.mjs")],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if fabric_output_test.returncode != 0:
        fail(f"fabric-output test failed: {fabric_output_test.stdout.strip()}")
    print(fabric_output_test.stdout.strip())

    decision_test = subprocess.run(
        ["node", str(ROOT / "scripts/test-decision-observer.mjs"), str(ROOT)],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if decision_test.returncode:
        fail(f"decision observer test failed: {decision_test.stdout.strip()}")
    print(decision_test.stdout.strip())

    todo_test = subprocess.run(
        ["node", "--test", str(ROOT / "scripts/test-todo-queue.mjs")],
        cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    if todo_test.returncode:
        fail(f"todo-queue test failed: {todo_test.stdout.strip()}")
    print(todo_test.stdout.strip())

    tools_test = subprocess.run(
        ["node", str(ROOT / "scripts/test-tools.mjs"), str(ROOT)],
        cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    if tools_test.returncode:
        fail(f"tools test failed: {tools_test.stdout.strip()}")
    print(tools_test.stdout.strip())

    reader_test = subprocess.run(
        ["node", str(ROOT / "scripts/test-reader-pane.mjs")],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if reader_test.returncode:
        fail(f"reader pane test failed: {reader_test.stdout.strip()}")
    print(reader_test.stdout.strip())

    print(f"PASS exact extension lock: {len(package_json['dependencies'])} direct, {len(package_lock['packages']) - 1} total entries")
    print("PASS single default configuration, observability selection, and safe pi-fabric wiring")
    print("PASS release contains no known credential, session, cache, recovery, context-store, or log paths")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"FAIL {error}", file=sys.stderr)
        raise SystemExit(1)
