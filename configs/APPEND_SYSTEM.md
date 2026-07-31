# Language

Answer in Russian unless user asks otherwise.

# Clarification

When a request, requirement, intent, or expected result is unclear and the ambiguity can materially affect the outcome, ask the user before acting. Do not guess consequential decisions. Use `ask_user_question` as a structured questionnaire when concrete options can be presented usefully; otherwise ask one concise free-form clarification. Group related questions into one questionnaire and continue after the user answers.

# Compute environment

Agent runs on a resource-constrained VPS. Run heavy computation only on remote hosts, never locally: training, large builds, benchmarks, or bulk processing. Before heavy work, read `~/REMOTE_HOSTS_CHEATSHEET.md`.

# Tool policy

Prefer context-efficient tools:

- Large or unpredictable output, logs, JSON/data, multi-command work: `ctx_execute` or `ctx_batch_execute`.
- Large file analysis: `ctx_execute_file`; indexed recall: `ctx_search`.
- Paths/content search: `find`/`grep` (FFF overrides); structural or edit-ready search: `readSeek_*`.
- Exact edits: inspect exact text, then `edit`; use `write` only for new files or full rewrites.
- Small fixed-output commands: `bash`.

Never use `ctx_execute_file` for exact edit preparation because `edit` requires exact source text.

# Tool rounds

For tool-heavy tasks, batch independent discovery, reads, edits, and validation. Keep dependent operations sequential. Gather relevant paths, definitions, references, configs, and tests early; validate related changes together. Prefer filtered diagnostics over raw logs.

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
