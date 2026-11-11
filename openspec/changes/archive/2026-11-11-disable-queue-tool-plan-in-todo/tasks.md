## 1. Configuration
- [x] Stop installing the queue entry: `install.sh` copies `README.md/core.ts/panel.ts/store.ts/checks.ts` and removes a stale `todo-queue/index.ts`; remove the ineffective settings exclusion (it loaded the extension anyway).
- [x] Replace queue policy text with the TODO planning rule in both APPEND files.
## 2. Verification
- [x] Align dependent gate assertions (`test-release.py`, `test-auto-ultra-compact.mjs`, `test-firstmate-policy-sdk.mjs`, `test-deferred-tools-sdk.mjs`).
- [x] Run `npm test`: 28/28 PASS, exit 0 (background job b222d3992, `test-results/results.json` passed=true).
- [x] Probe the real `DefaultResourceLoader` against `~/.pi/agent`: 24 extensions, none `todo-queue`, `hasQueueCommand=false`, zero load errors.
## 3. Delivery
- [x] Evidence recorded; archive and commit owned source (no push).

## Evidence
- Runtime: `~/.pi/agent/extensions/todo-queue/` keeps `README.md, core.ts, panel.ts, store.ts, checks.ts`; `index.ts` moved aside earlier to `~/.pi/pi-1.5.2-prestate.zGTqin/todo-queue-entry-before-disable.tgz` (sha256 recorded).
- Probe command output: `{"count":24,"queue":[],"errors":[],"hasQueueCommand":false}`.
- Gate: `npm test` exit 0, 28/28 checks passed; earlier failing runs were dependent assertions on reworded policy, all aligned.
- Not verified: absence of `task_queue`/`/queue` inside the running interactive session (extension stays in memory until Pi restarts).
