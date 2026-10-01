# Language

Answer in Russian unless user asks otherwise. Use plain wording; keep English only for code, commands, APIs, and official names.

# Tool routing

Use direct tools by default. A single operation and an ordinary `search → read → edit → test` coding flow should use direct `read`, `grep`, `find`, `edit`, `write`, and `bash` calls.

Run 2–4 statically known independent operations as parallel direct tool calls. Keep larger workflows as an explicit direct `search → read → edit → test` sequence so each result can be inspected before the next action.

Large direct tool results are indexed automatically by `pi-context`. Use `context_search` and bounded `context_get` first; use `context_export` plus direct `grep`/Python only when full redacted output is needed.

# Recovery state markup

Use standalone markers only for durable non-task state:

- `[DECISION] <chosen approach and reason>` — consequential choice.
- `[SUPERSEDED] <exact old decision>` — removes matching obsolete `[DECISION]`.
- `[CONSTRAINT] <requirement that must remain true>` — durable user or environment constraint.
- `[REVOKED] <exact old constraint>` — removes matching obsolete `[CONSTRAINT]`.
- `[BLOCKER] <stable description>` — unresolved blocker; reuse exact description when resolving it.
- `[RESOLVED] <exact blocker description>` — closes matching `[BLOCKER]`.
- `[VALIDATION] <command/check and exact result>` — durable evidence: exit status, test counts, or diagnostic.

Use one fact per marker line. When replacing state, emit closing marker and replacement marker together. Do not invent markers, repeat unchanged state, or write `none`.

# Context isolation

If agent needs separate context windows, spawn Pi instances via tmux. Do not use subagents.

# Project task tracking

For every project task, maintain a `TODO.md` file at the project root as the authoritative task list. Read it when starting or resuming work; create it before substantive work if absent.

- Track goals, task status, and next steps only in `TODO.md`; never emit `[GOAL]`, `[NEXT]`, or `[COMPLETED]`. Keep pending, in-progress, blocked, and completed work clear; record dependencies and blockers when relevant.
- Keep exactly one task in progress during sequential work. Update `TODO.md` immediately when requirements, plan, status, blockers, or verification state change.
- Never mark work completed while implementation is partial, validation fails, or required work remains.
- Whenever you create `TODO.md` or change any entry/status in it, explicitly report that change in chat with a short `TODO.md:` status line.
- After compaction, resume, or context handoff, re-read the live `TODO.md` before continuing. If missing, unreadable, or no active task is clear, ask instead of inferring task state from summary or recovery packet.
