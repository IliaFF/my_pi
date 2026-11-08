# Deployment evidence

## Authorization and source

The operator explicitly approved installing the two runtime instruction files, private backup, preservation/mode checks, offline SDK/host validation and verified rollback on failure. No live DeepSeek calls, dependency updates or automatic restart were authorized. Source revision: 97462787c4612bd85853595beed3a3e8a699336d. Initial Git worktree was clean; deployment documentation is the only new Git scope.

## Guarded installation

- Runtime: /home/ilyaz/.pi/agent. Profile matched Git pre-change 0b5f373^ exactly; old delegation block matched the same baseline. Destinations and their parent directories were checked against symlinks before writes.
- Backup: /home/ilyaz/.pi/my-pi-backups/terminal-default-routing-20261108-ttK4QA (private directory, mode 0700). Files: APPEND_SYSTEM.md, terminal.md, manifest.json with source revision/original SHA256/modes, candidate files and verification reports. Installer/maintenance backup pointers were not changed.
- Replaced only agents/terminal.md with current Git source, and the APPEND block from '# Long-lived delegation' up to '# Tracked project work'. Immediate input hash guards and candidate/preservation checks passed before copying. Both original modes were retained: APPEND 0755, profile 0644.
- The personal APPEND differs from the generic source outside this block. Those private bytes, including unrelated communication/skills/checking and TODO text, were preserved rather than overwritten by a full source copy.
- Profile after SHA256: 4c86fc0089a82ec13344b088aa398cf735eddb611201fad5dfe3fef56bc1e5b4.
- APPEND after SHA256: 65559ae0475b7f3846a67a01e6bd1321c024a654169cc113bc71079e96b7cecb.
- settings.json, mcp.json, global AGENTS.md and extensions/subagent/config.json hashes remained unchanged. Dependencies, credentials and installed maintenance were not targeted or updated.

## Checks

- Before/after byte equality and private prefix/suffix preservation: PASS; backup original hashes and installed modes verified again after the full gate. Local proofs: verification.json and final-verification.json in the backup.
- Actual installed SDK with DefaultResourceLoader, in-memory session, empty tools, disabled extensions/skills and in-memory credentials: assembled prompt contains the new terminal default/short-task/GPT ownership rules plus the retained private rules; old blanket small-scout threshold absent. Synthetic provider callCount = 0, extensionsLoaded = 0. Proof: sdk-verification.json. Source no-network hook was active.
- npm test -- --agent /home/ilyaz/.pi/agent: exit 0, all 29 stages PASS, Node v24.18.0, Python 3.12.3. Includes terminal SDK/capability tests and real RPC startup of installed extensions without model turns. Artifacts: test-results/results.json and per-stage logs (ignored local files).
- Reviewed complete two-file runtime diff: only approved delegation/profile changes. Full owned deployment docs and strict OpenSpec/diff checks cover the final documentation/archive state.

## Rollback and limitations

No rollback was needed. To revert this deployment, first check for later edits and preserve them; then restore APPEND_SYSTEM.md and agents/terminal.md from the corresponding two backup files, restore the manifest's modes and verify original SHA256 values. Stop if hashes/modes fail; do not claim successful restoration. This two-file deployment is not an atomic transaction and backup/checks are accessible to the author, not independent enforcement. Backup is neither the installer tar format nor maintenance restore-backup format; do not feed it to those tools.

Runtime files are installed, but existing sessions/processes can retain old prompts and advertised profile metadata. Restart Pi before relying on the workflow. No live DeepSeek run, answer quality, savings, latency or instruction obedience was tested. Bash/edit/write remain user-authority tools, not an OS sandbox. Installed maintenance intentionally remains at its previous revision; future full installs must use current Git and preserve reviewed personal APPEND content.
