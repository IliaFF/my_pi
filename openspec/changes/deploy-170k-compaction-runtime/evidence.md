# Deployment evidence

- Approved runtime update from committed source 40c8dfe, core remains 1.4.0. Source/runtime dependency locks matched before installation.
- First installer job bca5a2788 failed because the clean git archive lacked source OpenSpec dev tooling. Automatic rollback PASS. settings.json, APPEND_SYSTEM.md, AGENTS.md, mcp.json and auth.json hashes matched the private baseline afterwards.
- Linked the already installed source node_modules into the clean staging directory for tooling only; no new dependency version or source code change. Retry job bc3f1be0d exit 0.
- Installer --preserve-settings --install-core PASS, including the complete installed offline test-build gate (27/27). Maintenance failures=0 warnings=4, all four warnings are retained private config drift (settings/mcp/APPEND/AGENTS).
- Backup: /root/.pi/my-pi-backups/20261031T180634Z.LlzeUj; state.json and 61 MiB agent-files.tar.gz present. ~/.bashrc baseline additionally saved as bashrc.before in that backup. No private payload committed.
- After installation, private settings/instructions/auth hashes remained unchanged. Runtime extension and lock bytes match source. Native compaction enabled=true.
- Only ~/.bashrc PI_AUTO_COMPACT_PERCENT (70 -> 100) and PI_AUTO_COMPACT_EFFECTIVE_TOKENS (220000 -> 170000) changed; full bashrc diff reviewed. bash -n PASS; new interactive bash asserts both values PASS. Noninteractive bash intentionally skips .bashrc, so it retains inherited old values.
- Regression under the new interactive-shell environment with no-network guard PASS, including 169999/170000 boundaries, both real SDK deterministic owner orders and zero model/auth calls.
- OpenSpec strict validation and git diff --check PASS. Existing TODO modifications, .pi/tasks/ and unrelated Canary planning artifacts preserved and excluded from this commit.
- No live model/MCP/SSH checks or CI job. npm reported 11 dependency vulnerabilities (6 moderate, 5 high); no unsolicited audit fix applied.
- Current Pi process was not restarted or hot-reloaded. User must open a fresh interactive shell and restart Pi, or source ~/.bashrc before launching it, to receive the updated environment.
