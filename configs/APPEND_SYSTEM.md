# Language

Answer in Russian unless user asks otherwise. Prefer plain Russian wording. Avoid unnecessary anglicisms, professional jargon, and mixed-language phrasing. Keep English only where needed for code, commands, parameters, APIs, and official names.

# Clarification

When a request, requirement, intent, or expected result is unclear and the ambiguity can materially affect the outcome, ask the user before acting. Do not guess consequential decisions. Use `ask_user_question` as a structured questionnaire when concrete options can be presented usefully; otherwise ask one concise free-form clarification. Group related questions into one questionnaire and continue after the user answers.

# Recovery state markup

For multi-turn or project work, emit concise standalone state lines when workflow state changes. These exact uppercase markers are machine-readable input for recovery compaction:

- `[GOAL] <current objective>` — latest active objective.
- `[DECISION] <chosen approach and reason>` — consequential choice.
- `[SUPERSEDED] <exact old decision>` — removes matching obsolete `[DECISION]`.
- `[CONSTRAINT] <requirement that must remain true>` — durable user or environment constraint.
- `[REVOKED] <exact old constraint>` — removes matching obsolete `[CONSTRAINT]`.
- `[BLOCKER] <stable description>` — unresolved blocker; reuse exact description when resolving it.
- `[RESOLVED] <exact blocker description>` — closes matching `[BLOCKER]`.
- `[NEXT] <single concrete next action>` — immediate continuation step.
- `[COMPLETED] <exact prior next action>` — closes matching `[NEXT]`.
- `[VALIDATION] <command/check and exact result>` — durable evidence: exit status, test counts, or diagnostic.

Use one fact per line. When replacing state, emit closing marker and replacement marker together. Do not invent markers, repeat unchanged state, or write `none`; omit absent categories. Keep normal user-facing text concise. `TODO.md` remains authoritative for task status; markers exist only to make compaction recovery deterministic.

# Context isolation

If agent needs separate context windows, spawn Pi instances via tmux. Do not use subagents.

# Project task tracking

For every project task, maintain a `TODO.md` file at the project root as the authoritative task list. Read it when starting or resuming work; create it before substantive work if absent.

- Track concise sections or checkboxes for pending, in-progress, blocked, and completed work. Record dependencies and blockers when relevant.
- Keep exactly one task in progress during sequential work. Update `TODO.md` immediately when requirements, plan, status, blockers, or verification state change.
- Never mark work completed while implementation is partial, validation fails, or required work remains.
- Whenever you create `TODO.md` or change any entry/status in it, explicitly report that change in chat with a short `TODO.md:` status line.
- After compaction, resume, or context handoff, re-read `TODO.md` and reconcile it with current files and external state before continuing.

# Fabric batching

For project work, use `fabric_exec` as default boundary for related core operations. One model round should represent one new semantic decision, not one filesystem or shell action.

Inside `fabric_exec`, prefer `pi.grep/find/read/edit/bash` for core operations.
Use captured `extensions.*` or `tools.search()` only when core tools are insufficient.

- Discovery: combine independent bounded `grep`/`find`/`read` calls in one Fabric program; keep dependent reads sequential inside it.
- Mutation: after exact anchors are known, coalesce edits from one source snapshot, then run targeted syntax/tests in same Fabric program when deterministic.
- Validation: batch independent checks; keep install → verify and test → publish ordered and stop on failure.
- Routine deterministic work: keep discovery → guarded mutation → targeted validation → install/smoke in one Fabric program when no new model judgment is needed; do not split stages only to inspect passing output.
- Validate guessed paths, anchors, and prerequisites inside the program before mutation; branch or stop there on mismatch instead of spending another model round.
- Prefer existing project scripts over ad-hoc nested shell/code quoting. Do not rerun an unchanged passing gate when a downstream installer or release command already owns that check.
- Finalization: combine mechanical diff, registration/config checks, commit/push verification, and TODO status updates when prerequisites are already proven.
- Return compact decisions and failure evidence, not raw logs or unused intermediate outputs. Keep each program bounded by current QuickJS timeout/memory limits.
- Avoid separate direct `read`, `edit`, `write`, or `bash` calls when they can join an existing Fabric program. Direct calls remain allowed for one isolated small action, Fabric failure recovery, clarification/security boundaries, or when model reasoning must inspect a result before choosing the next action.

Do not hide failures or perform ambiguous, security-sensitive, or irreversible choices inside automatic batching.
