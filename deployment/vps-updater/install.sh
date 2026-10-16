#!/usr/bin/env bash
# Explicit operator deployment; does not enable the timer or copy credentials.
set -euo pipefail
[[ $EUID == 0 ]] || { echo 'Run on the VPS as root'; exit 1; }
source_root=$(cd "$(dirname "$0")/../.." && pwd)
node_root=${1:?Pass an existing Node >=24 installation directory}
"$node_root/bin/node" -e 'if(Number(process.versions.node.split(".")[0])<24)process.exit(1)'
[[ ! -e /opt/my-pi-updater ]] || { echo 'Existing installation: back up and upgrade manually'; exit 1; }
for role in agent test; do
  getent passwd "pi-update-$role" >/dev/null || useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin "pi-update-$role"
done
install -d -m 0755 /opt/my-pi-updater
install -d -m 0755 /opt/my-pi-updater/node/bin /opt/my-pi-updater/node/lib/node_modules
install -m 0755 "$node_root/bin/node" /opt/my-pi-updater/node/bin/node
cp -a "$node_root/lib/node_modules/npm" /opt/my-pi-updater/node/lib/node_modules/
ln -s ../lib/node_modules/npm/bin/npm-cli.js /opt/my-pi-updater/node/bin/npm
ln -s ../lib/node_modules/npm/bin/npx-cli.js /opt/my-pi-updater/node/bin/npx
install -m 0644 "$source_root/scripts/vps-updater.py" /opt/my-pi-updater/vps-updater.py
install -m 0644 "$source_root/deployment/vps-updater/gate.sh" /opt/my-pi-updater/gate.sh
install -d -m 0700 /etc/my-pi-updater /var/lib/my-pi-updater /var/lib/my-pi-updater/auth
install -d -m 0711 /var/lib/my-pi-update-jobs
export PATH="/opt/my-pi-updater/node/bin:$PATH"
npm install --prefix /opt/my-pi-updater/runtime --ignore-scripts --no-audit --no-fund --save-exact '@earendil-works/pi-coding-agent@1.3.0' '@earendil-works/pi-ai@1.3.0' '@earendil-works/pi-tui@1.3.0'
install -m 0644 "$source_root/deployment/vps-updater/login.mjs" /opt/my-pi-updater/runtime/login.mjs
python3 - <<'PY'
from pathlib import Path
import json
prefix=Path("/opt/my-pi-updater")
package=prefix/"runtime/node_modules/@earendil-works/pi-coding-agent"
metadata=json.loads((package/"package.json").read_text())
entry=metadata["bin"]
if isinstance(entry,dict): entry=entry["pi"]
config={"repository":"git@github.com:IliaFF/my_pi.git","github_repo":"IliaFF/my_pi","state":"/var/lib/my-pi-updater","jobs":"/var/lib/my-pi-update-jobs","auth_home":"/var/lib/my-pi-updater/auth","node":str(prefix/"node/bin"),"pi_cli":str(package/entry),"model":"openai/gpt-6.1-sol","gate":str(prefix/"gate.sh"),"hermes":"/root/.local/bin/hermes"}
path=Path("/etc/my-pi-updater/config.json")
path.write_text(json.dumps(config,indent=2)+"\n")
path.chmod(0o600)
PY
install -m 0644 "$source_root/deployment/vps-updater/my-pi-updater.service" /etc/systemd/system/
install -m 0644 "$source_root/deployment/vps-updater/my-pi-updater.timer" /etc/systemd/system/
systemctl daemon-reload
echo 'Installed, timer DISABLED. Provision authorized OAuth, verify gate and notifications, then enable timer.'
