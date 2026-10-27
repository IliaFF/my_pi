# Verification evidence

## Baseline and scope

- Initial revision: `059f7215723d1172a2da465b83f798697206fcc6`.
- Pre-existing changes: `TODO.md` and this change's untracked planning artifacts. Initial diff and artifact copies saved locally under `/tmp/pi-remote-baseline/`; unrelated queue entries preserved. TODO.md is excluded from the source commit.
- Versions: Node `v24.18.0`, actual Pi SDK/core `1.3.0`, `pi-ssh-remote` `0.1.15`. No dependency/version change.
- Source implementation: existing `patches/pi-ssh-remote+0.1.15.patch`, plus manifest reason, build gate entry and README limits. Only isolated repository npm dependencies were patched for testing; personal installed runtime was not modified.

## Regression and implementation

- Before fix: `node scripts/test-remote-shell-sdk.mjs npm/node_modules` exited 1 at `Windows connect failed: Remote command exited with code 1`. The actual package/Pi SDK connected to the loopback SSH fixture, which rejected its Unix timeout/bash/cd/pwd wrapper. Local artifact: `test-results/remote-shell-before.log` (not committed).
- After fix: the same actual-package SDK/SSH regression PASS. Verified connect and missing-cwd fallback; cwd/chdir with spaces; invalid chdir keeps old cwd; exec cwd override is not persisted; standalone Windows cd and tool/slash identity; reconnect probes shell again; unsafe cwd rejected before command transmission; errors 7/124/137 are not mislabelled as timeout; one-second local deadline and actual session abort; bounded output with readable full-output artifact; read/write/edit/bash remain local; model context declares local routing; unsupported shell, oversized probe and silent probe fail boundedly. POSIX uses real bash/timeout in the fixture and retains apostrophe/space cwd, timeout, routed bash and reconnect.
- The probe checks default-shell expansion directly (`%OS%`), not an invocation of cmd.exe that could also succeed from PowerShell. Home/Windows cwd shell metacharacters are deliberately unsupported and rejected; no general Windows escaping claim.
- Forward/reverse patch replay against the saved unpatched 0.1.15 source PASS; replayed index.ts is byte-identical to the tested package. No registry/live request made for this replay.

## Mandatory gate

`npm test`: **PASS, 17/17 checks**, exit 0, setupErrors empty. Includes strict OpenSpec, unit/release, patch apply/verify, stack surface, actual deferred-tools SDK, new remote-shell SDK (16.776s), train/queue/Ponytail/background/loop/context integration and RPC startup. Run via ordinary background shell, job `b6450966a`; terminal exit confirmed by runner notification.

Local artifacts: `test-results/results.json`, bounded per-stage logs and `/tmp/pi-remote-baseline/gate-results.json`, `/tmp/pi-remote-baseline/full-gate.log`. These are evidence on this machine, not source artifacts for commit.

Syntax checks (`node --check` regression script, Python compile of test-build.py), strict change validation and `git diff --check`: PASS. Full owned source patch, callers, documentation, new regression and planning artifacts reviewed against initial state; unrelated TODO entries and generated task logs remain outside the source commit. Post-gate changes are evidence/task metadata only, validated separately; executable code and tests are unchanged from the passing full gate.

## Limitations at offline acceptance

- Windows fixture responses are emulated; SSH channels and Pi SDK execution are real. No patched live connection to Ильяз's Windows PC, interactive rendering or Windows Unicode/code-page validation was performed. Earlier successful direct SSH identity is not proof that this patch works on the live host.
- Windows local deadline/abort closes the SSH channel and bounds local waiting, but may leave a remote process running. Standard tools and `!` stay local; full Windows filesystem adapters and PowerShell default shell are outside scope.
- Arbitrary ProxyCommand and CLI `-o IdentitiesOnly` parsing remain unsupported; existing ProxyJump/per-hop SSH config behavior is unchanged.
- At offline acceptance, no production installation, Windows settings change, user-key copy/read, provider request, CI job, push or archive was performed. Activation needs separately approved backup/install and reload/restart. Source change remains active until archival is requested.

## Initial authorized isolated live attempt (blocked)

The user separately selected isolated live validation without runtime installation. A temporary process loaded the exact patched repository package through real Pi SDK and faux provider; temporary HOME/agent config referenced existing absolute key paths and the saved public host fingerprints. Keys were used only by SSH authentication, not copied or printed; unknown/changed host fingerprints were rejected. Temporary local state was removed on exit.

- Patched remote connect: **FAIL before Windows shell detection**, destination handshake returned `Connection lost before handshake`. No whoami/hostname command ran through the patched extension.
- Control check using the original ordinary SSH ProxyCommand route: **FAIL**, exit 255, `Connection closed by UNKNOWN port 65535`.
- First-hop SSH to Moscow: **PASS**. Read-only listener check showed reverse-tunnel port 22240 listening on loopback. A listening socket does not prove that the tunnel's Windows endpoint or sshd is healthy.
- This attempt does not establish a patch regression or successful Windows compatibility. Live acceptance is blocked until the Windows SSH endpoint responds through the tunnel; PC power, sshd and tunnel health are not proven. No Windows command/settings change or production installation occurred.
- After recording the live failure, repeated `npm test`: **PASS, 17/17**, exit 0 (job `b9f7c84a9`); strict change validation and diff checks PASS. This offline result does not resolve the live handshake failure.
- Private local diagnostic artifacts: `/tmp/pi-remote-live-check.mjs` and `/tmp/pi-remote-live-check.log`; not committed. No live identity or private SSH config is copied into source. Executable source/tests are unchanged from commit `6d4a438` and its passing 17/17 offline gate.

## Successful isolated live verification after user repair

This result supersedes the live-connect blocker above. The user reported that Windows had no sshd service and loopback port 22 was unavailable. The official GitHub MSI attempt failed with 1603 at SetPrivilegesOnSshd (1060: missing service); MSI maintenance nevertheless reported Server Installed: Local. The user ran server-component repair with `REINSTALL=Server REINSTALLMODE=amus`, then reported exit 0 and sshd Running. The origin of the earlier MSI/service inconsistency was not established.

A fresh run of `/tmp/pi-remote-live-check.mjs` through the exact repository-patched extension and actual Pi SDK completed with **exit 0**:

- Live remote connect **PASS** through the configured jump host and reverse tunnel; default shell detected as `cmd`, toolRouting reported `local`.
- Live remote exec **PASS**: `cmd.exe /c "whoami & hostname"` returned the expected account and hostname, asserted exactly by the private local harness. Identity output was reported to the user, not copied into Git.
- Disconnect **PASS**; temporary local HOME/agent state removed. Existing keys were referenced only for authentication, never copied or printed; saved public host fingerprints were enforced.
- Private output artifact: `/tmp/pi-remote-live-check-after-repair.log`. No production Pi installation, Windows configuration change by the agent, provider request, push or archive. Windows service installation/repair was performed by the user, not by the isolated verification process.

This proves live connect and identity exec on this host, not long-lived session stability, Windows file adapters, Unicode/code-page behavior, arbitrary commands or reliable remote process termination on timeout. The installed Pi runtime still needs separately approved installation/reload to use the patch in ordinary sessions.
