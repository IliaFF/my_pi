## MODIFIED Requirements

### Requirement: Post-update acceptance matches the aligned baseline
The approved stable baseline MUST pin core and pi-tui 1.4.0 and align the managed extensions with the exact candidate lock. This candidate MUST pin browser-use 0.1.32, Ponytail 5.3.3, Markdown Preview 0.25.0, Web Access 0.45.0 and pine-of-glass 0.18.4, retaining all other authorized exact pins and existing local contracts. Acceptance MUST include the full source gate and each approved host gate, backed-up configuration-preserving scoped deployment and a separate actual-SDK check of any active project Ponytail override. Stock npm update alone MUST NOT be described as preserving local patches. Source-only authorization MUST NOT imply permission to deploy or run live provider checks.

#### Scenario: Repair after stock update
- **WHEN** source and each approved runtime retain their version-gated patches
- **THEN** full gates pass against the aligned lock, private settings/auth/instructions and unrelated dependencies are preserved, actual CLI versions match and restart/live-test limits are reported

#### Scenario: Source-only automatic candidate
- **WHEN** only isolated source repair is authorized
- **THEN** all exact targets and existing patch contracts pass the full unchanged offline npm gate before archive, and host deployment, live behavior and CI remain explicitly unverified
