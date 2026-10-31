## Why
The user explicitly requested updating the installed Pi after the tested 170k source delivery.

## What Changes
- Deploy committed source 40c8dfe using the existing installer with backup and preserve-settings.
- Align only the two legacy compaction overrides in ~/.bashrc to 170000 effective tokens and 100 percent; preserve other private settings and credentials.
- Validate the installed runtime offline and record restart requirements.

## Capabilities
### Modified Capabilities
None. Deployment only; skip_specs: true. The compaction contract is already implemented and tested by restore-170k-auto-compaction.

## Impact
Approved personal runtime only, no demo or remote host changes, live provider calls or fleet startup. Source npm lock matches the installed lock and core is already 1.4.0.
