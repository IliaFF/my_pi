## 1. Reconcile
- [x] Save original refs and uncommitted files outside the repository.
- [x] Compare local unique commits against newer origin/main.
- [x] Resolve merged source without version downgrades or lost safeguards.
- [x] Exercise failing rollback regression before integrating missing safeguards.

## 2. Validate
- [x] Pass full npm test including real SDK/startup and rollback fixtures.
- [x] Review owned diff and confirm pre-existing files are preserved.
- [x] Record evidence and commit source/specs/tests together; do not install runtime.
