# Why

Free-text evidence can outlive the files it checked. Add deterministic task-bound check records, without Jev, extra agents, automatic polling or production deployment.

# What Changes

- Add task_queue check/checks operations using the existing process-only bg_run/bg_status tools.
- Capture a bounded whole-project fingerprint before launch and on terminal inspection; bind command, cwd, task id/text, job id, exit status and fingerprints to session entries.
- Once a task uses recorded checks, completion requires its latest checks per command/cwd to have exited successfully and still match the files. Pending checks block completion; older failures can be superseded by an explicit rerun.
- Keep direct-evidence-only tasks compatible. Never infer PASS from output text or accept caller-supplied exit codes.

# Capabilities

## Modified Capabilities
- `task-selection`: task-bound snapshot validation.
- `build-validation`: pure and actual SDK/package offline coverage.

# Impact

Only local todo-queue source, offline tests and documentation; source installation must include the new helper. No dependencies, Jev, new scheduler, polling loop, automatic wake or production updates.
