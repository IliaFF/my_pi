## Context

The existing source `local-extensions/jev-review` already owns the final-settle check and one-correction budget but is currently removed by the installer. Extend that owner; do not add another settle loop. Experiments are private external evidence, not repository fixtures. Tests must use synthetic public fixtures and the actual pinned Pi SDK.

## Decisions

### Model gate and lifecycle
Session-local mode is auto/on/off, default auto. Match the actual selected model id's DeepSeek family, never user text or a model display name. Auto mode with no/unknown/virtual non-DeepSeek id is inactive. An explicit old enabled=true entry maps to on, false to off. Reconstruct only the active branch. New prompt, model change, branch/session switch and shutdown invalidate pending classifier work; late results cannot inject context or schedule feedback. Compaction never itself calls a model; hydrated content is restored for subsequent generation without treating all historical branches as current.

### One workflow owner
Use `before_agent_start` structured prompt sections for current trusted skills/context and codemode guidance. Keep sections scoped and removable when disabled; do not replace the system prompt. Use the final-settle boundary for the existing bounded reviewer. One correction per user prompt, independent of tool/agent loops. No duplicated reviewer plugin. Commands remain explicit and available for diagnosis/manual checks.

### Selection, retrieval and boundaries
Read the real skill catalog from SDK prompt options. Classifier selection is advisory; explicit `/skill:name` requirements and already established relevant skill requirements cannot be negated by a score. Code in chat, helpers/tests and notebook cells count as code work even when file modification is prohibited. No language-specific list in the selection engine. Record unknown/failure and leave ordinary discovery available, rather than pretend all instructions were loaded.

Supply full selected SKILL.md, with source hash/version. Bound file and total sizes; oversized/unavailable content is explicitly omitted, never labeled complete. Local Markdown references inside the trusted skill root may be read within the same budget; no automatic remote fetch, shell execution, directory-wide ingestion or escape via links. External/unsupported references remain explicit work for the agent and are not certified as satisfied.

For minimal RAG, retrieve a few relevant passages from already-trusted SDK project context and permitted local reference documents, with source/line provenance. Do not read arbitrary history, private config or another project's files. Critical rules remain in the normal pinned prompt; retrieval cannot replace authoritative TODO/Firstmate state or grant permission. Retrieved material is data, not higher-priority instructions.

### Codemode
On enabled models, prefer codemode for justified multi-tool work, independent batches and bounded result filtering. Require inspection of each outcome/exit code. Dependent decisions stay separate. Use existing registered/discoverable tools; do not hide capabilities or change permissions based on Jev tool scores. No codemode penalty for an appropriate single direct call or a conceptual answer. Diagnostics distinguish top-level and parent-linked nested calls without logging script bodies or arguments.

### Rules, feedback and evidence
Include active project rules, applicable loaded instructions, current request and scoped action evidence. Explicitly distinguish a demonstrated violation, compliance, insufficient evidence and inapplicability. Missing result bodies or truncated evidence cannot prove noncompliance. Flag sources/rule identifiers and probabilities; never certify correctness from a classifier score. Deterministic file/tool/coverage facts take precedence. A correction is bounded and preserves authorization; no autonomous destructive retry, rollback or permission expansion. No correction for unknown/unavailable evaluations.

### Diagnostics and budget
Keep local owner-private bounded logs with schema version, session/branch/request identifiers, model, event type, source hashes, complete/omitted flags, classification scores/status, direct/nested tool names/outcomes, elapsed time and reported usage/cost. Do not persist full prompt/file bodies, tool arguments, provider response bodies, credentials or thinking. Mark rotations, omissions and diagnostic failures. Persist only compact state needed for active-branch recovery; do not flood the model with logs. Bound classifier payload/time/retry and correction count; no classifier calls from compaction itself. Tests use no external providers or credentials. Preserve existing auth and private settings on installation.

## Validation

Before implementation, add failing regressions for non-DeepSeek auto-disable and generalized hydration. Test actual SDK before-start/context/provider-payload/settle transitions, arbitrary catalog skills, classifiers unavailable/malformed/stale, complete vs oversized documents, trust/link boundaries, compaction and branch isolation, explicit controls and migration. Exercise real codemode nested tool events and failure propagation, not handler-only mocks. Test redaction, file permissions, bounded logs, omitted evidence and one-correction safety. Integrate tests in npm test and installation contract/rollback checks. No live service-quality claim from offline tests.

## Deployment

User authorized global install and push to origin (verified as my_pi). Follow the existing backup/verified install path only after the source gate/review passes. Verify installed hashes and disposable SDK startup, preserve private runtime, archive the change and commit scoped files. Push must not include experiment logs, chats, keys or production auth. Backup/restore are rollback controls, not immutable independent validation.
