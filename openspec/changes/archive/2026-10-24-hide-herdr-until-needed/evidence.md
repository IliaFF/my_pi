# Evidence

## Scope and baseline
Root task `d72b6105328c`; initially clean source `f69395504e9d100dd56f174007517650e6ba5bf1`. User explicitly authorized source work and local installation with backup. Source already deferred ten Herdr tools; installed package did not. No project Herdr override exists (project package override is Ponytail only).

## Regression and implementation
Actual SDK regression first failed with `Herdr skill must not be advertised before discovery` (false versus true). Applied `disable-model-invocation: true` to the pinned package skill through the versioned patch and added the file to manifest verification. The real loader retains the skill for explicit invocation, while the effective fresh prompt omits its advertisement. Permanent delegation prose retains eligibility/safety/continuity/parent responsibility and a short discovery pointer, not the completion procedure. No new loader, dependency or executor changes.

Extended actual SDK checks reject model catalog, coordinator/naming prose and skill description in a fresh prompt; unrelated context/remote discovery also leaves routing/catalog absent. Existing discovery verifies refreshed catalog delivery, all ten original schemas, safe local list, permission/validation refusal and additive serialized prefix/resumed loadouts. First test adjustment incorrectly assumed a provider `systemPrompt` property; corrected it to inspect actual provider messages. Final narrow source and installed-package regressions pass with zero network attempts.

## Gates and review
- Source pre-install check `6206dbc5-9402-4f8f-a491-d1872d0fbb0d` / job `ba83d3f1a`: exit 0, 22/22 stages and diff whitespace. Afterwards corrected a literal apostrophe in patch context (no behavior change).
- Job `b6e05aa17` reran `npm test` successfully on that corrected source, then installed via `./install.sh --preserve-settings --install-core` and ran the installer's complete installed-dependency gate successfully (including host drift, SDK, IPC, RPC startup).
- Reviewed the full owned diff against initial HEAD, including untracked proposal/design/specs/tasks/evidence. Production change is only skill frontmatter plus compact permanent prose; existing tools/executors remain intact. Existing populated sessions intentionally retain their declared tools.

## Local deployment
- Installer backup: `/home/ilyaz/.pi/my-pi-backups/20261024T183806Z.Xh1fV7` (installer state.json + agent-files.tar.gz; rollback via uninstall.sh --backup).
- Separate policy backup and pre-install config hashes: `/home/ilyaz/.pi/my-pi-backups/herdr-prompt-GLPDZlLi`.
- Installer preserved personal APPEND, then the reviewed delegation-only source difference was aligned explicitly after successful install; backup contains previous APPEND.
- Exact hashes unchanged for settings.json, mcp.json, my-pi-settings.json, auth.json and herdr-agents/config.json. No secrets copied into source/evidence. Removed teach remains inactive.
- Post-alignment maintenance verify: failures=0, warnings=2, only audit-only personal settings.json/mcp.json differences; APPEND and all package patches pass.
- Installed-package actual SDK test: PASS, zero network attempts, no initial Herdr schemas/catalog/skill advertisement, successful on-demand discovery.

## Limits
No real child launches, paid model requests, external provider/cache/quality/latency checks or remote CI. Current UI session still contains old declarations; user must reload/restart and create a new session for a clean initial prompt. No UI-switching tool is available here; native task handoff is reserved for independent tasks and is not used to move this related verification. Archive/final snapshot evidence is recorded in root TODO without mutating this evidence after its final check.
