# Evidence — latest stable alignment

## Source and registry
- npm registry /latest checked for 23 runtime dependencies and OpenSpec; no prerelease selected. Core/pi-tui 1.2.0 and Chrome MCP 1.10.1 already latest.
- Updates: browser-use/shared 0.1.26, ssh-remote 0.1.15 (adds ssh-config 5.3.0), typebox 1.3.37, OpenSpec 1.14.1. Exact source locks updated; no unrequested major/transitive force upgrade.
- Preservation RED: test-install-preservation.py exit1, AssertionError installer must support preserving personal configuration. GREEN: fresh bootstrap, existing model/provider/custom data, pinned string/object package updates, unpinned/custom/local references, byte-identical APPEND/context policy, default mode overwrite.
- npm ci on WSL-mounted source timed out at 180s; incomplete generated modules replaced with isolated Linux temporary installation + ignored symlink. Source npm test 12 PASS; exact release replay PASS, 23 direct/471 lock entries. Full source/config/lock/installer diff reviewed.
- Commit a30511c: https://github.com/IliaFF/my_pi/actions/runs/38655460849 conclusion success.

## Approved deployment
- install.sh --preserve-settings --install-core exit0. Pi core already1.2.0; no core replacement. Installer backup state.json and non-empty agent-files.tar.gz verified under $HOME/.pi/my-pi-backups/20261014T234133Z.Ayoaeb.
- SDK peers deployed1.2.0, RPIV2.13.8 first-turn patch applied, source loop-profiler restored. All23 direct runtime packages exactly match source latest stable versions.
- 4 protected files byte-identical. Personal settings structurally identical except managed npm pins. All1344 previous sessions retained; current session1 changed only by append with original digest matching a prefix. No user content, digests or credentials included here.
- Installed host gate12 checks PASS; verify failures0/warnings3. Warnings are intentional audit-only personal settings/mcp/APPEND differences, not stale managed extensions or dependencies. Do not snapshot private settings into Git.
- Global OpenSpec updated1.14.0→1.14.1. Installed maintenance tooling installed from lock; runtime modules linked to host runtime, not workspace.
- Additional installed maintenance gate reproduced portable unit regression:16 tests/1 failure, git check-ignore required missing .git. Ignore test now initializes temporary repository with source .gitignore. Installed archive gate then12 PASS; actual installation remains without .git.

## Boundaries
- Current process still holds previously loaded code; restart Pi required. No automatic restart or paid model/API, Telegram, SSH or Chrome live validation.
- Runtime npm audit0; OpenSpec tooling still4 high in braces/micromatch/fast-glob/OpenSpec chain, no compatible fix advertised (audit --force proposes OpenSpec0.17.2 downgrade). Not suppressed or force-fixed.
- pi-zai-usage1.1.0 remains incompatible with new OpenAI-only gpt-6.1-sol credentials; existing probe reports limitation. Latest release does not fix it.
- No install failure: rollback was not needed or exercised on production; existing isolated backup-integrity/restore regressions pass. Final post-archive source CI is tracked separately in parent TODO until confirmed.
