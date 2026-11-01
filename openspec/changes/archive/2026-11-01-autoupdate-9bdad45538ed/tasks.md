## 1. Candidate preparation

- [x] Read repository instructions and affected specifications; create the OpenSpec change before edits.
- [x] Inspect upstream metadata and align the existing exact browser-use pin/lock with the authorized target.
- [x] Verify all twenty target pins and preserve protected files, package membership, scripts and allowScripts.

## 2. Validation and completion

- [x] Install root and runtime dependencies using npm ci --ignore-scripts --legacy-peer-deps.
- [x] Run OpenSpec strict validation and the unchanged full npm test gate.
- [x] Review the full source delta and record results and limitations in evidence.
- [x] Archive the completed change at the requested path only after full npm test PASS.
