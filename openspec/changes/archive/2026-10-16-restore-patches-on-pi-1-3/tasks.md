## 1. Reproduce and prepare

- [x] 1.1 Record clean initial source status and reproduce current installed Preview/Ponytail SDK failures.
- [x] 1.2 Align proposal/specs/design before implementation and review callers/version consumers.

## 2. Restore portable source

- [x] 2.1 Align core/tui and five updated dependencies in manifests/lock and baseline consumers.
- [x] 2.2 Port only existing patches to Ponytail 5.3.0 and Preview 0.23.0; preserve SDK coverage.
- [x] 2.3 Run fresh lock installation, full npm test and fresh registry patch replay; review the entire owned diff.

## 3. Restore approved runtime

- [x] 3.1 Back up personal runtime and project override; deploy with private-settings preservation and recovery.
- [x] 3.2 Pass host gate and actual project Ponytail SDK checks; verify private settings/auth/APPEND and unrelated files unchanged.
- [x] 3.3 Record evidence/limitations and review the complete owned diff for archive/commit without private artifacts.
