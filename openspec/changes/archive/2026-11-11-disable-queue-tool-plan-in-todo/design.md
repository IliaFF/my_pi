## Approach
Disable the extension through the existing settings resource filter (`"extensions": ["-extensions/todo-queue"]`), the same mechanism already used for retired local extensions. Files stay installed so `local-extensions/task-session.ts` can import the TODO store, and re-enabling is a one-line change.

Policy: keep the Firstmate-session exception and the honest-check requirement, drop task ids/claim/release/check language, add the explicit planning rule.

## Verification
- Cheapest adequate check: mandatory `npm test` (static portable-config assertions updated to require the exclusion and the planning rule) plus a real SDK resource-loader probe against `~/.pi/agent` showing no `queue` command and no `task_queue` tool. The probe is run now and reported as evidence; it is not added to the gate because it needs a real user profile rather than a temporary agent.
- Assumption recorded: exclusion of an auto-discovered extension directory by `-path` works. The probe tests this assumption; if it fails, switch to renaming the managed extension directory or an explicit allowlist.

## Probe result (assumption tested, approach changed)
The planned `"extensions": ["-extensions/todo-queue"]` filter does not work: a real `DefaultResourceLoader` probe against `~/.pi/agent` still loaded `extensions/todo-queue/index.ts`, and `-path`/`!pattern` entries were passed through literally as module paths (one produced `Cannot find module .../-extensions/todo-queue`). The settings entry was removed. Instead the installer no longer copies the queue entry file and deletes a stale `index.ts`; `store.ts`/`core.ts`/`panel.ts`/`checks.ts` stay for `task-session.ts` imports. Probe after the change: 24 extensions loaded, none matches `todo-queue`, zero load errors.
