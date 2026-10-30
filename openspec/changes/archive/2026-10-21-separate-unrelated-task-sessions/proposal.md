# Proposal

## Why
Unrelated tasks accumulate old conversation and can inherit irrelevant assumptions. The user wants task-bound sessions for both TODO queue and ordinary chat, using a shared goal as the criterion and asking the user on ambiguity.

## What Changes
Add a native command-backed task-session handoff tool and portable agent instructions. The existing model assesses continuity before work; there is no paid classifier/subagent. Related work stays; uncertain relation is clarified; unrelated work starts automatically in a new session with a minimal self-contained request. Queue dispatch offers the candidate before claim, so evaluation precedes TODO mutation.

## Capabilities
### Added Capabilities
- `task-session-continuity`: semantic continuity policy and native session handoff.
### Modified Capabilities
- `task-selection`: queue candidates are assessed before claim.
- `general-agent-policy`: task-bound session instructions apply to chat and queue.
- `build-validation`: native SDK handoff and queue dispatch regression coverage.

## Impact
One extension/tool + internal command, queue dispatch/callers/tests, APPEND, installer/verification, offline full gate. No new dependency/config/classifier. No deployment, push or paid live tests without separate approval. Existing Ollama config/auth and unrelated user files stay untouched.
