# Why
The single authorized VPS repair stopped without archiving because two protected updater tests assume browser-use baseline0.1.26 and target0.1.28. On an updated0.1.28 baseline the supposed update is a no-op, so rejection assertions fail. Offline reproduction confirmed both tests pass on the old baseline and fail on0.1.28; the agent correctly refused protected-test edits. This invocation did not reproduce historical SIGXFSZ.

# What Changes
Make the two fixtures choose the next stable patch from the baseline and construct only the intended browser dependency/root lock/resolved entry/settings change. Re-run their existing positive/negative and incomplete-repair assertions against synthetic updated and future baselines. Do not change controller behavior, real package pins, protection, limits or live retry policy.

# Capabilities
## New Capabilities
None.
## Modified Capabilities
- `build-validation`: updater fixtures remain meaningful after managed dependency pins advance.

# Impact
Only tests/vps_updater_test.py and OpenSpec. Existing SDK/RPC gates stay mandatory. Local source fix/commit only; publication, production deployment and another live repair are separately approved work.
