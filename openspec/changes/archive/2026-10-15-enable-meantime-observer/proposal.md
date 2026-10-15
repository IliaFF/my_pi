# Enable Meantime observer

## Why
User explicitly requested enabling installed Meantime and a separate mechanism review of context/cache/background/advisor candidates, without using peer-version compatibility as an idea filter. Only Meantime activation is approved; other packages remain review-only.

## What Changes
Add pi-meantime to the existing pine-of-glass extension allowlist in portable and personal settings. Retain all current extensions and package versions. Add offline command and UI timer lifecycle regression; keep observer passive and model-free. Review reusable ideas separately in fresh_pi reports.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- build-validation: passive Meantime loading and bounded lifecycle checks.

## Impact
settings allowlist, startup/surface tests and README. Explicit host activation with full backup, no new packages, no paid calls, no unrelated configuration resets. Source/host/maintenance gates, evidence/archive/local commit required. Actual interactive rendering and real latency attribution are not proven by headless tests.

Source inspection found DEFAULT_CONFIG.enabled=false: also add configs/pi-meantime.json with enabled=true, an audit-only managed config, and installer bootstrap that preserves existing user config in preservation mode. Backup records previous config absence; exact manual rollback also removes that newly created file, besides restoring old settings.
