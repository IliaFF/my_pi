#!/usr/bin/env python3
"""Exercise installer config merge without changing the host."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parent.parent
source = (root / "install.sh").read_text()
start = source.index('python3 - "$AGENT_DIR" "$ROOT/configs" <<\'PY\'\n')
script = source[start:].split("\n", 1)[1].split("\nPY\n", 1)[0]
with tempfile.TemporaryDirectory(prefix="pi-config-merge-") as temp:
    agent = Path(temp)
    def merge():
        subprocess.run([sys.executable, "-", str(agent), str(root / "configs")], input=script, text=True, check=True)
    merge()
    config = json.loads((agent / "mcp.json").read_text())
    chrome = config["mcpServers"]["chrome"]
    assert chrome["exposure"] == "codemode"
    assert chrome["args"][0].startswith(str(agent) + "/npm/")
    train = agent / "train-agents/config.json"
    assert json.loads(train.read_text())["sessionScope"] == "all"
    custom = {"mcpServers": {"chrome": {"command": "custom"}, "existing": {"command": "keep"}}}
    (agent / "mcp.json").write_text(json.dumps(custom))
    train.write_text('{"targetFile":"custom.md"}')
    expected = {"mcpServers": {**config["mcpServers"],
                               **custom["mcpServers"]}}
    merge()
    assert json.loads((agent / "mcp.json").read_text()) == expected
    assert json.loads(train.read_text()) == {"targetFile": "custom.md"}
print("PASS installer: custom agent path; existing MCP servers/Chrome and training config preserved")

subprocess.run([sys.executable, str(root / "scripts/test-install-preservation.py")], check=True)
