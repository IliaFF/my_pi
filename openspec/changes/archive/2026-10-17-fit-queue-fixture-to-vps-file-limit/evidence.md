# Evidence

## Reproduction
- Actual isolated VPS test UID, unchanged systemd sandbox and fresh locked dependencies: initial gate passed RPC startup and all stages except queue-checks. The single 257 MiB sparse fixture raised EFBIG under LimitFSIZE=64M before fingerprint validation.
- Added test_queue_fixture_fits_sandbox_file_limit to the existing updater suite. Before fixture correction: targeted unittest exit 1, exact EFBIG reproduction (reports/autoupdate-settings-pins/file-limit-before.log, local).

## Fix and validation
- Replaced only that single large fixture with five sparse files of exactly 64 MiB; unchanged real fingerprint rejects the aggregate with /byte limit/. No production fingerprint or sandbox change.
- python3 -B -m unittest tests.vps_updater_test: exit 0, 29 tests, including the real capped subprocess (file-limit-after.log, local).
- Clean-lock full VPS gate on source-v2 archive SHA256 42c6d1628c0a1bbfda2297a1b9188253678726028cab4f9b198dcaa2c294c295: exit 0, all 18 stages. npm ci lifecycle scripts disabled, original installed gate, pi-update-test UID, temporary HOME, hidden OAuth path, original systemd resource limits. RPC startup PASS in 7.553s. Private host log: /var/lib/my-pi-manual-validation/pins-Kf4ZTUm0/gate-v2.log. Model/provider not invoked. Working runtime/controller/timer unchanged.
- Full owned controller/test/fixture/docs/OpenSpec diff reviewed; git diff --check PASS. Final archive validation/commit follow the passing full gate.

## Limits
Hosted CI not run for this local change. Local final RPC smoke timed out twice before VPS validation, with RAM/swap nearly exhausted; no attribution or live compatibility claim is made. Fix does not authorize an automated repair agent to change tests. Controller deployment and one authorized retry are separate tracked work, preserving gate, CI and retry history.
