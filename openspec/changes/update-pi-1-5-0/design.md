## Initial state
Source 118b4e3 was clean. Fast-forward to origin/main 68ab8d8; no local commits lost. PATH Pi 1.4.0, registry latest 1.5.0. Root TODO is authoritative. Existing source dependencies are ignored symlinks to a local cache and must not be removed to bypass snapshot controls.

## Decisions
Use exact 1.5.0 core/tui and retain other pins. Install candidate dependencies separately from the active runtime. Preserve tests and safety contracts. If compatibility fails, record failing regression before adapting production code. Use approved install.sh --preserve-settings --install-core --skip-stack only after source PASS. Preserve credentials, sessions, private model/provider and non-browser MCP settings. Keep rollback backup and global core pre-state; do not hot-reload this session.

## Validation
Unchanged npm test exercises actual SDK, patches and CLI. Review all owned diff and new files; strict OpenSpec validation. Installer supplies backup and host gate; separately verify CLI/SDK and private config deltas. Checks are editable by the agent and are not independent attestation; user can inspect Git diff and logs. Offline PASS does not establish live service availability. No new control infrastructure.
