# Evidence: real Herdr spawn and sidebar

## Baseline and versions
- Clean pi-build `90f89ae`; authoritative task `4974f431ba7f`, root TODO outside source Git.
- Pi CLI 1.4.0, Node 24.18.0, Linux/WSL, Herdr CLI/server 0.9.3.
- Extension/sidebar pinned to clean upstream SHA `8864764e65a469f7d90f9a0deb39ec3f0b26befc` (pi-herdr-agents 3.3.1). No candidate source patches or runtime dependency additions.

## Executed integration
- Upstream `node --test .../test/integration/sidebar.test.ts`, isolated HOME/XDG/servers and actual attached TUI: exit 0, 8 passed/0 failed/0 skipped, ~25s. Covers real rendered Focus/All, blocked/unknown, other view owner, real Pi exit/suspend and pane reuse, independent parent markers, 15s TTL, missing pane, unlink.
- `scripts/evaluate-herdr-spawn.mjs`, actual parent Pi calls pinned subagent tool to launch actual persistent child Pi in its own pane: PASS. Three tasks, same child session, distinct task IDs, bounded <=16000 character results delivered to parent, two manual deterministic compactions, active recall_folded/context_search/context_get across them, zero extra child summary calls, marker live, successful stop and no specialist in agent list.
- Spawn probe rerun after assertions strengthened: PASS. 14 loopback fake-provider calls, exactly 3 child calls, no external model calls. Only selected context profile, not production/codemode/MCP runtime. Final review added clean-tree preflight and a realpath boundary check ensuring the child session stays inside the private lab; the final opt-in rerun also passed with the same output digest.
- Private Herdr Pi integration and local plugin.link only. No installation into production, current panes/views unaffected, no copied auth/history/config. Lab server cleanup succeeded; no matching test-named server processes remained. Tests are synthetic mechanics characterization, not delegation of real one-window user work.
- New optional probe syntax covered by existing two-test policy/harness unit file; Ruff/autopep8 pass. Mandatory npm gate does not itself launch Herdr or agent children.

## Artifacts
- Report: `docs/herdr-sidebar-integration.md`; earlier comparison linked forward without rewriting prior archived evidence.
- Sidebar log `/tmp/pi-herdr-sidebar-integration.log`: SHA-256 `5bd5fb666fa127a324586137e019b4cb994be0b2e22f432503ad001b2f31be13`.
- Spawn log `/tmp/pi-herdr-spawn-context.log`: SHA-256 `211ef209e210684de5b3e8a2891cc0e75b8068aaf51ab561a76dbab2cc48852d`.
- Transient files, lab profiles, sessions, dependencies and credentials are not committed.

## Boundaries and recommendation
Technically ready for separately approved installation of pinned extension plus sidebar. No production adoption yet. Focus is server-wide display only and has marker TTL/occupant delay. Worktrees/markers/extensions are not a sandbox. No actual autonomous >1-managed-window task, real model semantic retention, live-provider recovery, quality/cost/speed claim, full production roles/tool allowlist, remote/multi-client/native Windows/macOS test or CI run. External runner termination can skip finally; do not signal uncertain residue. Persistent specialist crash recovery remains absent.

## Source validation
Full owned tracked/untracked diff reviewed against 90f89ae, including the optional probe, report and OpenSpec files. Python formatting/Ruff and the two-test harness scope passed; strict current change validation passed. Full `npm test` passed all 22 stages, exit 0, check `2ec60f99-cd89-47e3-9405-b911d8864026` / job `bb21eb2c9`; its closing snapshot was inspected before archive edits. The same command must pass on the final archived source snapshot. Final check/commit recorded in authoritative root TODO.
