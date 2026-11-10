# Evidence

- Real SDK regression RED: `node scripts/test-firstmate-policy-sdk.mjs npm/node_modules` exited 1 before the policy edit, missing `Before editing code, choose and record...` in the assembled prompt. Local log: `/tmp/pi-bounded-policy-red.log`.
- Same real SDK regression GREEN after the policy edit: exit 0, no network/model calls.
- `openspec validate bounded-verification-policy --strict --no-interactive`: PASS.
- `npm test`: exit 0, all 28 stages PASS, including actual SDK policy assembly and RPC startup. Log: `/tmp/pi-bounded-policy-npm-test.log`; generated report: `test-results/results.json` (not committed).
- `git diff --check`: PASS. Full owned tracked diff and new proposal/design/spec/tasks reviewed with ponytail-review; no blocking findings. Pre-existing untracked `openspec/changes/archive/2026-11-08-enable-terminal-herdr-inspector/` preserved and excluded.
- Authorized runtime application: only the identical two source paragraphs inserted into `~/.pi/agent/APPEND_SYSTEM.md`. Byte comparison verified that removing the insertion restores the exact original text; original mode preserved; source/target paths checked for symlinks; original content checked again immediately before replacement.
- Private original backup: `/home/ilyaz/.pi/my-pi-backups/bounded-verification-policy-2026-11-10T20-13-18.100Z/APPEND_SYSTEM.md` (file 0600, directory 0700). Backup bytes verified. Added 795 bytes. No full installer or package operation.

# Limits

Instructions are not enforced controls. SDK tests establish prompt presence and precedence, not DeepSeek compliance or quality. No live provider, SSH, paid requests or CI job. Model/reasoning settings and other personal APPEND text unchanged. Existing process prompts are not hot-reloaded; use reload/new session. A trusted project APPEND can override global APPEND; precedence is intentionally unchanged. Atomic single-file replacement is not a cross-process lock; avoid simultaneous profile edits. Backup restoration must preserve any later user changes.
