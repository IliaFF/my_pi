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

## Limitations

- Windows fixture responses are emulated; SSH channels and Pi SDK execution are real. No patched live connection to Ильяз's Windows PC, interactive rendering or Windows Unicode/code-page validation was performed. Earlier successful direct SSH identity is not proof that this patch works on the live host.
- Windows local deadline/abort closes the SSH channel and bounds local waiting, but may leave a remote process running. Standard tools and `!` stay local; full Windows filesystem adapters and PowerShell default shell are outside scope.
- Arbitrary ProxyCommand and CLI `-o IdentitiesOnly` parsing remain unsupported; existing ProxyJump/per-hop SSH config behavior is unchanged.
- No production installation, Windows settings change, user-key copy/read, provider request, CI job, push or archive performed. Activation needs separately approved backup/install and reload/restart. Source change remains active until archival is requested.
