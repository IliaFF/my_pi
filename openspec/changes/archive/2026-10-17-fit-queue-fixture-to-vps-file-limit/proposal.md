# Why
Final validation in the real VPS test sandbox passed RPC startup but exposed an existing queue fixture incompatible with the unchanged 64 MiB per-file sandbox limit: ftruncate of one 257 MiB sparse file fails with EFBIG before testing the 256 MiB aggregate fingerprint budget. Local RPC retries also timed out under near-exhausted memory/swap; no timeout is weakened.

# What Changes
Represent oversized aggregate input as five sparse 64 MiB files instead of one 257 MiB file. Add an offline subprocess regression running the real queue tests under RLIMIT_FSIZE=64 MiB. Keep the production fingerprint budget, sandbox limit, deadlines and assertions unchanged.

# Capabilities
## New Capabilities
None.
## Modified Capabilities
- `build-validation`: oversized-input fixtures must fit the VPS per-file limit while exercising the real aggregate-byte rejection.

# Impact
scripts/test-queue-checks.mjs and existing tests/vps_updater_test.py only; no production queue/controller behavior changes, no dependencies or relaxed tests. Full clean-lock VPS test-UID gate required before controller deployment. Auth and unrelated VPS applications remain untouched.
