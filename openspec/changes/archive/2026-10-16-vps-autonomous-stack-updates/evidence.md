# Evidence: isolated daily VPS updater

## Authorization and pre-state

Root task `dd5cc13959d7` remains authoritative in fresh_pi/TODO.md. Source began clean at `ea7c521` (already-reviewed Pi 1.3 patch restoration), one commit ahead of origin/main `8a19a759282808788a98db8669413d48c6ec7689`. Existing VPS `/root/my_pi` had a modified TODO; it was not used or reset. User chose daily checks, automatic checked merge, existing Hermes Telegram, subscription only. A legacy OAuth-copy experiment was explicitly authorized; after incompatibility, the user authorized and completed separate browser login for the isolated updater.

## Regressions and implementation review

Initial updater tests failed with missing controller. Actual future-release fixture failed on the historical 1.3.0 literal, then passed after installer/manifest/SDK/TUI exact consistency replaced that literal. Later review caught attempt-history loss across fingerprints (KeyError regression) and unbounded private /tmp writes (missing TemporaryFileSystem regression). Both are fixed and covered. Behavioral SDK tests, patch replay and native-script policy are unchanged, not replaced with string checks.

Owned scope: one release validator modification; new stdlib controller, 23 updater tests, deployment units/install/gate plus OAuth helper, operator documentation, this change/specs. Review covered all owned additions, root execution boundaries, untrusted .git avoidance, lock registry/integrity, protected files, OAuth refresh clientId/scopes, source snapshot integrity, lease/direct-parent CAS, retry/resume/outbox, process/log/tmp limits and cleanup. No runtime, session, credential, dependency tree or private log belongs in Git.

## Verified checks before final archive

- Final combined scope: local `npm test` exit 0 (16/16 stages, 23 updater tests); independently, VPS credential-free `npm ci`/runtime lock install/`npm test` exit 0 (16/16 stages, 23 updater tests). No source bytes/modes mutated by the VPS gate. Controller SHA256 `1f60fdbae79d8676a433532b5684554c04fadeb2cbb64164a6cab8a6091691cb`. Private evidence: `reports/vps-stack-updater/final-source-gate.log` and VPS `final-vps-gate.log`, `final-vps-proof.json`, `final-test-results/`. The tmpfs-bound fix is included in both full gates. Archive/prose-only changes are subsequently checked again by exact-commit CI.
- Earlier local full `npm test`: exit 0, including real SDK integrations (22-test updater scope). Not claimed as final-scope evidence.
- Earlier VPS full credential-free gate: PASS from its source-only snapshot; accepted source bytes/modes unchanged after tests. Not claimed as proof of later review fixes.
- Real systemd sandbox: non-root test UID, root SSH/auth and agent HOME inaccessible, no API-key environment: PASS.
- Hermes Telegram home-channel delivery: actual CLI exit 0. No new bot or gateway settings installed.
- Separate native OpenAI OAuth completed; stored type oauth, direct scope and refresh client metadata verified without printing secrets.
- Actual `openai/gpt-6.1-sol` subscription response: exact `UPDATER_CODEX_OK`, stop reason stop. Actual print-mode read-tool smoke: exact file content `UPDATER_READ_OK`. Credential readiness alone was not used as inference proof.
- Native core/AI/TUI runtime pinned to 1.3.0; separate Node 24.18.0 copy (~291 MiB combined initial footprint), no global package replacement.

## Failed experiments and limitations

Renaming a legacy Codex token to provider openai caused real 401 api.responses.write. A diagnostic core-only downgrade to 0.80.3 hit an incompatible transitive SDK; rejected, restored to matching 1.3.0 pins. One controller transfer accidentally contained tool-sidecar metadata rather than code; it failed compilation before execution and was replaced using source bytes with SHA256/compile verification. An initial model smoke timed out at 180s; bounded JSON and explicit-isolation print/read smokes subsequently succeeded. No claim that the initial timeout's precise cause was established.

Seven existing VPS file fingerprints were recorded. Auth/Hermes/existing project TODO remained unchanged. Settings differed only in lastChangelogVersion 1.2.0 -> 1.3.0: exact original bytes were reconstructed by that one-field change and matched the initial SHA256. Functional settings are unchanged; the current changelog marker was not reverted because attribution to our process versus concurrent use is not established. PC runtime was not installed, updated or copied.

The installed controller is root-owned outside Git checkouts; agent/test UIDs have no GitHub SSH or Hermes credentials. Outbound network is not fully sandboxed. Model mistakes or malicious upstream code are not ruled out by tests. Protected-judge/config/controller migrations require manual review. Refresh results preserve native clientId/scopes; no paid API-key fallback exists.

## Publication order

Project governance requires full gate/review, then archive and commit. A GitHub Actions run cannot test an uncommitted archive SHA. Therefore live exact-commit CI, checked bootstrap fast-forward, timer activation and final notification are tracked under the still-open root TODO after archive/commit; no remote CI success is claimed here before an actual job. Bootstrap includes the earlier reviewed patch-restoration commit; the autonomous controller thereafter accepts only direct children of its recorded main base. Timer remains disabled until the published baseline is verified. Private post-commit run IDs/results are retained in fresh_pi/reports/vps-stack-updater, not amended into a different untested source SHA.
