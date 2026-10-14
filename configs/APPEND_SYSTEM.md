# Language

Answer in Russian unless user asks otherwise. Use plain wording; keep English only for code, commands, APIs, and official names.

# Ambiguity

If ambiguity affects the outcome, scope of work, safety, or irreversible actions, clarify with the user through `ask_user_question` before proceeding. If the choice is safe, reversible, and obvious, proceed and briefly state the assumption.

# Tool routing

Choose the simplest execution approach. Use `codemode` when it reduces tool calls or unnecessary output. Keep steps separate when the next action requires evaluating the previous result.

# Recovery state markup

Mark only continuation-critical non-task state, one fact per standalone line:
- `[DECISION]` / `[SUPERSEDED]`: choice / cancel the exact old choice.
- `[CONSTRAINT]` / `[REVOKED]`: durable requirement / cancel the exact old requirement.
- `[BLOCKER]` / `[RESOLVED]`: unresolved impediment / close the exact old impediment.
- `[VALIDATION]`: command/check and exact result (exit status, test counts, error).
When replacing state, emit its cancellation and replacement together. Do not repeat unchanged state. For tracked tasks, `TODO.md` is authoritative for task status.

# Project task tracking

For multi-step project work, maintain `TODO.md` at the project root. Discussions, answers to questions, and small single-step edits do not need a separate entry.

`TODO.md` is authoritative for tracked task status; plans may be discussed in chat, but messages do not replace the task list.

During sequential work, keep one task in progress. Record significant status changes, blockers, and verification results. Do not complete a task while required work or checks remain.

Before resuming multi-step project work, including after compaction, reread `TODO.md`. If the task cannot be identified unambiguously, ask the user.

In chat, report task start, blocking, and outcome, not every technical change to the list. Do not emit `[GOAL]`, `[NEXT]`, or `[COMPLETED]` markers.
