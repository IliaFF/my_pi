# Design

Use installed pine-of-glass 0.15.3; append only extensions/pi-meantime/** to its three existing allowlist entries. Source and runtime settings change identically at this entry, personal fields elsewhere preserved. Existing maintenance-format full backup before runtime edit; versions/lock/patches unchanged.

Meantime observes context/provider/stream/tool boundaries, registers /pace, renders a live widget and uses a one-second timer. No provider calls, prompt rewriting or new jobs. Existing native RPC smoke verifies command loading with network blocked; the surface probe exercises actual package hooks with fake UI/timers to check reload cleanup and shutdown. These complement, not replace, mandatory SDK gates. Actual TUI appearance and correct interpretation of real provider timings remain manual checks after reload.

Review other package mechanisms from the previously pinned source snapshots, not registry peer compatibility; no install, Fusion, warming, advisor consultations or architecture changes authorized. Preserve authoritative TODO and existing compaction/retrieval owners.

Source inspection found DEFAULT_CONFIG.enabled=false: also add configs/pi-meantime.json with enabled=true, an audit-only managed config, and installer bootstrap that preserves existing user config in preservation mode. Backup records previous config absence; exact manual rollback also removes that newly created file, besides restoring old settings.

The full source gate initially failed: pine-of-glass hardcodes HOME/.pi/agent rather than PI_CODING_AGENT_DIR. Model the standard user layout with a HOME/.pi/agent symlink to the existing isolated agent inside the temporary sandbox. No upstream path rewrite or host changes. Nonstandard runtime locations still require explicit project/user config; custom-location support is not claimed.
