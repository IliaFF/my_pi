# Why
The fixed 170k extension cap compacts large-window models prematurely. The user requested Canary-triggered compaction and a 500k fallback, subsequently approving a model-safe ceiling and three consecutive Canary failures.

# What Changes
- Raise the local extension cap to 500000; retain native reserve-based automatic compaction for smaller models.
- Pin pi-canary 1.5.0 with COUNT=3, POSITION=equidistant, VARIANT=fixed, FAIL_COMPACT=3.
- Patch the Canary failure branch to resume the original request after compaction and recover from compaction errors; keep context-fold as sole deterministic summary owner.
- Validate with real SDK/faux provider and deploy only the owned files/settings with backup.

# Capabilities
Modified: compaction-reliability. No VPN/server work, provider/model change, paid live tests or unrelated dependency updates.

# Impact
Canary adds one model request per user prompt and may invalidate prompt cache due to distributed markers. Recall success is not proof of answer quality. The current configured OpenAI model has 272k context; its reserve-based native trigger remains earlier than 500k.
