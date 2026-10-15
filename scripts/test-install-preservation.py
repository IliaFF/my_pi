#!/usr/bin/env python3
"""Execute installer personal-config block, without touching host/npm."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parent.parent
source = (root / "install.sh").read_text()
assert "--preserve-settings" in source, "installer must support preserving personal configuration"
start = source.index("# Personal configuration start")
end = source.index("# Personal configuration end")
script = source[start:end]
with tempfile.TemporaryDirectory(prefix="pi-preserve-") as temp:
    agent = Path(temp)
    context = agent / "my-pi-settings.json"
    def deploy(preserve):
        env = {"AGENT_DIR": str(agent), "ROOT": str(root), "CONTEXT_SETTINGS": str(context), "PRESERVE_SETTINGS": str(preserve)}
        subprocess.run(["bash", "-euc", script], env={**os.environ, **env}, check=True, timeout=30)
    deploy(1)
    defaults = json.loads((root / "configs/settings.json").read_text())
    assert json.loads((agent / "settings.json").read_text()) == defaults
    original = {"defaultProvider": "private-provider", "defaultModel": "private-model", "custom": {"keep": True}, "packages": [
        "npm:pi-ssh-remote@0.0.1", {"source": "npm:@amaster.ai/pi-browser-use@0.0.1", "extensions": []},
        "npm:pi-workspace-history", "npm:custom-plugin@2.0.0", "./private-plugin"]}
    (agent / "settings.json").write_text(json.dumps(original))
    (agent / "APPEND_SYSTEM.md").write_bytes(b"PRIVATE INSTRUCTIONS\n")
    context.write_bytes(b'{"private":"policy"}\n')
    before = json.loads(json.dumps(original))
    deploy(1)
    after = json.loads((agent / "settings.json").read_text())
    deps = json.loads((root / "npm/package.json").read_text())["dependencies"]
    expected = json.loads(json.dumps(before))
    expected["packages"][0] = "npm:pi-ssh-remote@" + deps["pi-ssh-remote"]
    expected["packages"][1]["source"] = "npm:@amaster.ai/pi-browser-use@" + deps["@amaster.ai/pi-browser-use"]
    assert after == expected
    assert (agent / "APPEND_SYSTEM.md").read_bytes() == b"PRIVATE INSTRUCTIONS\n"
    assert context.read_bytes() == b'{"private":"policy"}\n'
    deploy(0)
    assert json.loads((agent / "settings.json").read_text()) == defaults
    assert (agent / "APPEND_SYSTEM.md").read_bytes() == (root / "configs/APPEND_SYSTEM.md").read_bytes()
print("PASS fresh bootstrap, personal settings/instructions/policy preservation, pin-only alignment, default installation")
