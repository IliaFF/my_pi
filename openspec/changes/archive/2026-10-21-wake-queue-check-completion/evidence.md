# Evidence

## Baseline and cause

Source began clean at 765b306756a1596a842230c942f13f9bf3d16ab3 after fast-forward from 24fc473. Installed queue and maintenance snapshot still explicitly used triggerOnCompletion:false. The common queueChecks.start launcher, not the generic background default, disabled continuation. Old task-selection/build-validation contracts also prohibited model wake.

## Regression

Before code change, actual queue/background SDK test exited 1: `Recorded checks must enable native completion wake`, actual false, expected true (`/tmp/pi-queue-wake-before.log`). After the one-boolean fix and fixture updates, job b107b9dff exited 0: snapshots, ownership, native continuation on success/nonzero exit/timeout, and no duplicate inspection wake. Native SDK and patched shell package use a scripted faux provider, not external credentials/model calls.

## Timeout diagnosis

Previous gate bcff06856 installed 405 dependencies in five minutes, then hit internal harness/deferred deadlines and overall 900s limit. Standalone read-only diagnosis bde5ad544 exited 0: offline release 61.32s; deferred-tools 46.17s with zero network attempts. This reproduces slow execution, not a failing functional assertion. The release subprocess has a 30s harness deadline. Runtime test dependencies had been installed as a real directory on /mnt/d after npm replaced the earlier non-directory node_modules entry. Moving generated dev dependencies to Linux storage is an environment-only mitigation; original trees are retained outside the Git source, deadlines/assertions remain unchanged. It does not establish service/provider availability or a general performance improvement.

## Final validation

Full source gate b6e3d390c exited 0: 19/19 stages, setupErrors empty, unchanged tracked diff SHA-256 dde342e44b66875512859a3a8152e8da994009cb04957d19f79a987a9dc01eb4 before/after. All owned tracked diff and new change files reviewed; git diff --check PASS. Strict OpenSpec 15/15 PASS. Linux dependency preparation b2fc07633 exited 0 (57 tooling, 405 runtime packages, scripts disabled); ignored symlinks point to /home/ilyaz/.cache/pi-build-deps-4aUu0J, original directories retained in fresh_pi/.pi/dev-deps-backup-j25G2i. With this environment the unchanged gate passed harness 17.302s, deferred-tools 1.842s, queue-checks-sdk 7.096s and RPC startup 4.737s. This is an observed environment effect, not a general benchmark.

## Deployment

User explicitly approved installation after source PASS, preserving personal configuration and creating backup. Installer b2bff7101 (`./install.sh --preserve-settings --install-core`) exited 0, host gate 19/19 PASS, verify failures=0/warnings=2 (expected audit-only settings.json/mcp.json drift). Backup: `/home/ilyaz/.pi/my-pi-backups/20261021T124643Z.UCQM9d`. Core remains 1.3.0. Installed queue checks.ts/index.ts byte-match source with triggerOnCompletion:true. Post-install assertions confirmed hashes of auth.json/models.json/APPEND_SYSTEM.md/my-pi-settings.json/pi-meantime.json unchanged, settings changed only by approved managed pins, pre-existing MCP definitions preserved. Source post-archive documentation sync remains; runtime code is installed. Reload/restart is required for this already-running session.

Read-only npm audit reports one transitive moderate Hono advisory GHSA-5r4p-p66f-jhc7 (serveStatic double URL decoding can bypass static-path middleware; affected range 4.12.4–4.13.10). No audit fix or dependency changes applied; exposure of that path was not assessed in this change. No push or paid live checks.

Final post-archive validation is run before the final source commit; code/spec/test content must remain unchanged after that check except evidence metadata.

## Archived final gate

Post-archive full host gate (npm test -- --agent ~/.pi/agent) exited 0; all 19 stages passed on the archived source, including installed package verification and offline SDK completion continuation. Final owned diff reviewed and git diff --check passed. Only this evidence paragraph was added after the gate; no code/spec/test inputs changed. Source commit is recorded in Git; no push.
