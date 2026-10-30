# Design

## Context

See proposal.md. Initial source is clean main at 75c6ecd, equal to fetched origin/main. Installed global instructions match exactly the two requested changes against their provided backups. Their current hashes are saved privately in /tmp/pi-stack-publication.IXcMik/instruction-hashes; neither file will be edited. Firstmate is a clean tracked checkout at the approved commit; no files there will be changed. Installed paper-search differs from committed source only in server.py; backup files are not inputs.

## Goals / Non-Goals

**Goals:** portable approved inventory; safe instruction fallback; source-only publication; exact package/source/artifact pins; offline acceptance.

**Non-Goals:** copying local runtime, SSH/hosts, auth, projects/fleet state, deviceId, paper-search dirty working tree, modifying Firstmate/upstream, deploying this release here, starting workers or proving live service quality. No global package-manager or OS changes during this task.

## Decisions

1. Keep configs/APPEND_SYSTEM.md identical to the originally reviewed two-fix target, not to an indiscriminate runtime export. Add configs/AGENTS.md containing the portable Firstmate section and the later user-approved resource-consent paragraph, published only here to avoid duplicate default context. Add it idempotently without replacing a private AGENTS.md; backup/rollback includes this managed file. Project APPEND precedence requires a genuine SDK assembly regression, not only a string check.
2. Firstmate stays a separately pinned checkout beneath the managed stack directory, with its own config/backend=herdr and project trust required on first launch. A launcher adds stack tools to PATH and enters that checkout; it does not copy extensions globally or run agents at install time. Existing independent homes are not reused, updated or deleted.
3. Bootstrap creates a new versioned store inside the agent-managed tree, validates exact revisions/checksums and refuses unsafe/replaced destinations. The installer's existing recoverable backup/rollback owns added instruction/skill/provider/launcher files; uninstall's exact-path allowlist is extended. The three style skills are managed as individual SKILL.md files, not directories, so rollback preserves unrelated sibling files. Persistent stack stores are never automatically deleted, including incomplete builds: after launch they can hold Firstmate runtime. Switching an existing managed release requires a separate runtime migration decision. Linux x86_64/WSL is the initial artifact target. OS prerequisites (Bash, Git, Node >=24, Python/venv, tmux and the existing Chrome requirement) are documented/preflighted, not installed via sudo.
4. AGENTS, MCP, AITunnel and style-skill templates opt out of generic runtime snapshot/restore through a backward-compatible snapshotRuntime flag. The previous snapshot loop would import the entire private AGENTS; a temporary-source failing regression demonstrated that before fixing the shared function. Other managed snapshots keep their old behavior.
5. Pin Herdr 0.9.5 and Treehouse 3.1.6, as actually installed, not Firstmate's older CI-helper versions. Preserve backend support. Retire only the Pi plugin's default dependency, manifest patch activation and plugin-only gate assertions; keep native remote/preview/context SDK and handoff tests intact.
6. Put Jev's pinned npm dependency/lock in its own managed MCP environment rather than pretending it is a Pi extension. Paper-search uses upstream cab1b5cc276a0cd004a0044003926a6440088049 plus the reviewed installed server delta and a portable exact dependency list. Do not package the installed venv, backups or local working tree. MCP defaults use managed paths and environment placeholders; existing server entries win.
7. Publish AITunnel's tiny registration with an environment key reference, model metadata and its existing currency-limit comment. Do not copy auth.json or provider secrets. Record that its costs are not verified USD values and live behavior is untested.
8. Copy the three approved SKILL.md files after privacy review, preserving contents except any nonportable/private values if present. Keep other installed extensions/configs untouched. Retain ordinary goal-based native handoff and unfinished-work protection outside Firstmate.

9. Fresh-install regression exposed that installer release preflight ran an installed-runtime compaction SDK harness before Pi/context-fold existed. A clean public-source copy plus an unusable fake Pi reproduced ERR_MODULE_NOT_FOUND, without loading any real agent. Internal PI_RELEASE_SOURCE_ONLY skips only that unavailable-runtime check during install preflight; pin/privacy/registry patch checks and runtime-independent harnesses still execute. The mandatory test-build environment explicitly forces full mode, so this cannot narrow npm test.

## Risks / Trade-offs

- [Expanded scope] → maintain one authoritative parent task and complete OpenSpec, failing regressions, full gate, owned-diff review, evidence and archive before publication.
- [Installing arbitrary source can execute code] → fixed Git commits, reviewed patch, fixed package/artifact pins, no provider credentials in tests; trust remains explicit.
- [OS prerequisites differ] → documented preflight and supported-platform refusal before mutation; no claim of universal installer support.
- [Firstmate/Herdr version compatibility] → isolated bootstrap/SDK checks do not prove real fleet operation; report that limitation, never launch a live fleet as a test.
- [Private instructions overwritten] → additive idempotent global context block, backup coverage, byte-preservation regression and no production edits.
- [Paper-search tool naming differs upstream] → preserve exactly the installed delta, verify patch target hash and exported names without live downloads.
- [Concurrent user edits] → recheck initial instruction hashes and final owned diff; preserve unrelated work and stop on overlapping changes.

## Post-pause resource boundary

The user reaffirmed whole-stack publication and approved only a bounded local pass with existing dependencies/tools. No new network installation, dependency relocation, prepared environment or agent launch is authorized by that local approval. The previously recorded runtime APPEND hash is expected to differ after the user's new resource-consent paragraph; preserve that runtime edit. The user explicitly approved publishing that resource paragraph only in portable AGENTS. Existing preserved APPEND content is not edited; its possible duplicate requires a separately agreed deployment migration. Final prolonged checks require a concrete cost estimate, cheaper alternative and direct user approval.

## Migration Plan

Publication only to IliaFF/my_pi. Run regressions before fixes, update source and caller/manifest/installer/rollback/test contracts together, run npm test and inspect complete owned diff including new files. Record exact evidence and limitations, archive after all tracked tasks pass, validate the archived scope, commit only owned paths and push normally to the confirmed branch. Fetch/recheck remote before push; divergence requires a separate decision, not force or implicit merge. Production installation is not authorized by this source-publication task.
