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
    if manifest.get("piCoreVersion") != "0.84.4":
        fail("unexpected Pi core version")
    if manifest.get("nodeMinimum") != "24.0.0":
        fail("Node >=24 required")
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
    if "pi-fabric" in package_json["dependencies"] or "node_modules/pi-fabric" in package_lock["packages"]:
        fail("Fabric remains in npm runtime/build lock")
    if (ROOT / "configs/fabric.json").exists():
        fail("Fabric runtime config remains")
    context_policy = json.loads((ROOT / "configs/pi-context.json").read_text())
    expected_context_policy = {"version": 1, "preset": "balanced", "retention_days": 7, "max_mb": 250, "purge_on_shutdown": False, "capture_max_bytes": 24576, "capture_max_lines": 300, "mcp_max_bytes": 51200, "mcp_max_lines": 2000}
    if context_policy != expected_context_policy:
        fail(f"unexpected pi-context policy: {context_policy!r}")
    if json.loads((ROOT / "configs/context-compaction.json").read_text()) != {"mode": "builtin"}:
        fail("built-in compaction is not the release default")
    expected_context_deps = {"@spences10/pi-context": "0.1.16", "typebox": "1.3.25", "@earendil-works/pi-coding-agent": "0.84.4", "@earendil-works/pi-tui": "0.84.4"}
    if any(package_json["dependencies"].get(name) != version for name, version in expected_context_deps.items()):
        fail("pi-context or its runtime peers are not exactly pinned")
    retired_compactor = [ROOT / "configs/output-compactor.json", ROOT / "local-extensions/output-compactor", ROOT / "scripts/test-output-compactor-extension.mjs"]
    if any(path.exists() for path in retired_compactor):
        fail("retired local output-compactor remains in release")
    routing_source = (ROOT / "local-extensions/tools.ts").read_text()
    for stable_tool in ["read", "grep", "find", "edit", "write", "bash", "context_search", "context_get", "context_export", "context_list", "context_stats", "context_purge"]:
        if f'"{stable_tool}"' not in routing_source:
            fail(f"direct/searchable stable tool surface missing: {stable_tool}")
    if "fabric_exec" in routing_source:
        fail("Fabric remains in stable tool surface")
    append_system = (ROOT / "configs/APPEND_SYSTEM.md").read_text()
    for required in ["Use direct tools by default", "Run 2–4 statically known independent operations as parallel direct tool calls", "Large direct tool results are indexed automatically by `pi-context`"]:
        if required not in append_system:
            fail(f"direct tool policy missing: {required}")
    if "fabric_exec" in append_system or "pi-fabric" in append_system:
        fail("Fabric remains in system policy")
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

    removed_decision_paths = [
        ROOT / "local-extensions/decision-observer.ts",
        ROOT / "configs/decision-observability.example.json",
        ROOT / "scripts/test-decision-observer.mjs",
    ]
    if any(path.exists() for path in removed_decision_paths):
        fail("removed decision observer files still present")
    openalex_skill = ROOT / "skills/openalex/SKILL.md"
    openalex_helper = ROOT / "skills/openalex/scripts/openalex.mjs"
    skill_text = openalex_skill.read_text()
    if "name: openalex-literature-search" not in skill_text or "description:" not in skill_text:
        fail("OpenAlex skill frontmatter missing")
    for command in (["node", "--check", str(openalex_helper)], ["node", str(openalex_helper), "--self-test"]):
        result = subprocess.run(command, cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        if result.returncode:
            fail(f"OpenAlex helper check failed: {result.stdout.strip()}")
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
        pine = next((spec for spec in settings.get("packages", []) if isinstance(spec, dict) and spec.get("source") == "npm:pine-of-glass@0.10.2"), None)
        required_pine = {"extensions/pi-contextimate/**", "extensions/pi-traceline/**", "extensions/pi-cachemire/**"}
        if pine is None or set(pine.get("extensions", [])) != required_pine:
            fail("pine-of-glass observability extension selection mismatch")
        active_sources = {spec if isinstance(spec, str) else spec.get("source", "") for spec in settings.get("packages", [])}
        if any(source.startswith("npm:pi-canary") for source in active_sources):
            fail("pi-canary must remain installed but disabled")
        if "npm:@spences10/pi-context@0.1.16" not in active_sources:
            fail("exact pi-context settings wiring missing")
        for exact_source in ["npm:@dietrichgebert/ponytail@4.9.0", "npm:@juicesharp/rpiv-ask-user-question@2.9.0"]:
            if exact_source not in active_sources:
                fail(f"exact settings pin missing: {exact_source}")
    readme = (ROOT / "README.md").read_text()
    for package in package_json["dependencies"]:
        if ("`" + package + "`") not in readme:
            fail(f"README extension inventory missing: {package}")
    for required in [
        "## Текущие packages и расширения",
        "### Локальные extensions",
        "### Что отключено и почему",
        "Searchable context sidecar",
        "@spences10/pi-context",
        "OpenAlex",
        "Legacy project-loop",
    ]:
        if required not in readme:
            fail(f"README extension status documentation missing: {required}")
    print("PASS README extension inventory and disabled-component rationale")

    install_source = (ROOT / "install.sh").read_text()
    uninstall_source = (ROOT / "uninstall.sh").read_text()
    for required in [
        'settings["packages"] = {**settings.get("packages", {}), "context": json.loads(policy_path.read_text())}',
        'node "$ROOT/scripts/test-pi-context-runtime.mjs" "$AGENT_DIR/npm/node_modules/@spences10/pi-context" "$probe_dir"',
        'touch "$AGENT_DIR/context.db"',
        'chmod 600 "$AGENT_DIR/context.db"',
        'rm -f "$AGENT_DIR/fabric.json" "$AGENT_DIR/extensions/fabric-output.json" "$AGENT_DIR/extensions/output-compactor.json"',
        'rm -rf "$AGENT_DIR/extensions/fabric-output" "$AGENT_DIR/extensions/output-compactor"',
        'rm -f "$AGENT_DIR/extensions/decision-observer.ts"',
        'cp -R "$ROOT/skills/openalex" "$AGENT_DIR/skills/openalex"',
    ]:
        if required not in install_source:
            fail(f"installer pi-context/stale cleanup wiring missing: {required}")
    managed_match = re.search(r"managed=\((.*?)\n\)", install_source, re.DOTALL)
    rollback_paths = {
        "extensions/context-compaction.json",
        "my-pi-settings.json",
        "extensions/output-compactor.json",
        "extensions/output-compactor",
        "skills/openalex",
    }
    if managed_match is None or any(f'"{path}"' not in managed_match.group(1) for path in rollback_paths):
        fail("installer rollback set omits managed extension config")
    if any(f'"{path}"' not in uninstall_source for path in rollback_paths):
        fail("uninstaller rollback allowance omits managed extension config")
    print("PASS installer and rollback include merged pi-context package settings, private DB bootstrap, and stale compactor/Fabric cleanup")

    forbidden_path = re.compile(r"(^|/)(auth\.json|sessions|recovery|context-store|logs?|mcp-cache(?:\.json)?)($|/)")
    secret_content = re.compile(r"(BEGIN [A-Z ]*PRIVATE KEY|(?:^|[^A-Za-z0-9])sk-[A-Za-z0-9_-]{16,})")
    for path in ROOT.rglob("*"):
        if ".git" in path.parts or "node_modules" in path.parts or not path.is_file():
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
        context_destination = temp_path / "pi-context"
        context_destination.mkdir()
        extract_package(tarball("@spences10/pi-context", "0.1.16"), context_destination)
        context_root = context_destination / "package"
        published = json.loads((context_root / "package.json").read_text())
        if published.get("version") != "0.1.16" or published.get("peerDependencies", {}).get("typebox") != "*":
            fail("published pi-context package/peer contract changed")
        for relative, marker in {
            "dist/text.js": "[context-sidecar] Large",
            "dist/config.js": "max_mb: 250",
            "dist/export-files.js": "mode: 0o600",
            "dist/lifecycle.js": "should_index_text",
        }.items():
            if marker not in (context_root / relative).read_text():
                fail(f"published pi-context contract missing {relative}: {marker}")
        expected_tools = {"search.js", "get.js", "export.js", "list.js", "stats.js", "purge.js"}
        if not expected_tools.issubset({path.name for path in (context_root / "dist/tools").glob("*.js")}):
            fail("published pi-context retrieval tool set changed")
        print("PASS published @spences10/pi-context@0.1.16 capture/retrieval/policy surface")

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
    print("PASS single direct-only configuration, observability selection, and searchable context policy")
    print("PASS release contains no known credential, session, cache, recovery, context-store, or log paths")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"FAIL {error}", file=sys.stderr)
        raise SystemExit(1)
