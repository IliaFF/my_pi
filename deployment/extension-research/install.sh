#!/usr/bin/env bash
# Explicit operator deployment only; never enables a timer or installs npm packages.
set -euo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run as root'; exit 1; }
source_root=$(cd -- "$(dirname -- "$0")/../.." && pwd)
prefix=/opt/my-pi-extension-watch
config=/etc/my-pi-extension-watch
state=/var/lib/my-pi-extension-watch
jobs=/var/lib/my-pi-extension-jobs
test -f /etc/my-pi-updater/config.json
systemctl is-active --quiet my-pi-extension-watch.service && { echo 'Monitor is active; wait/stop explicitly first'; exit 1; }
backup=/var/backups/my-pi-extension-watch/$(date -u +%Y%m%dT%H%M%S)-$$
install -d -m 0700 "$backup" "$config" "$state"
for path in "$prefix" "$config/config.json" /etc/systemd/system/my-pi-extension-watch.service /etc/systemd/system/my-pi-extension-watch.timer; do
  if [[ -e "$path" ]]; then cp -a --parents "$path" "$backup/"; fi
done
if ! id pi-extension-review >/dev/null 2>&1; then
  useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin pi-extension-review
fi
install -d -m 0755 "$prefix"
install -d -m 0711 "$jobs"
install -m 0644 "$source_root/scripts/vps-extension-watch.py" "$source_root/scripts/vps-updater.py" "$prefix/"
python3 - "$source_root" <<'PY'
import json,subprocess,sys
from pathlib import Path
source=Path(sys.argv[1])
updater=json.loads(Path('/etc/my-pi-updater/config.json').read_text())
if updater['model'] != 'openai/gpt-6.1-sol':
    raise SystemExit('Unexpected subscription model; operator approval required')
for name in ['node','pi_cli','auth_home','hermes','state']:
    if not Path(updater[name]).exists(): raise SystemExit('Missing updater prerequisite: '+name)
profile=json.loads((source/'deployment/extension-research/stack-profile.json').read_text())
profile['dependencies']=json.loads((source/'npm/package.json').read_text())['dependencies']
profile['revision']=subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()
configuration={k:updater[k] for k in ['node','pi_cli','auth_home','hermes','model']}
configuration.update(state='/var/lib/my-pi-extension-watch',jobs='/var/lib/my-pi-extension-jobs',updater_state=updater['state'],profile=profile)
path=Path('/etc/my-pi-extension-watch/config.json')
path.write_text(json.dumps(configuration,ensure_ascii=False,indent=2)+'\n');path.chmod(0o600)
PY
install -m 0644 "$source_root/deployment/extension-research/my-pi-extension-watch."{service,timer} /etc/systemd/system/
systemctl daemon-reload
echo "Installed; timer state unchanged (not enabled by installer). Backup: $backup"
