## ADDED Requirements

### Requirement: Post-update acceptance matches the aligned baseline
The restored baseline MUST pin core and pi-tui 1.3.0 and the five extensions already upgraded by the approved stock update. Acceptance MUST include the full source gate and host gate, backed-up configuration-preserving scoped deployment and a separate actual-SDK check of any active project Ponytail override. Stock npm update alone MUST NOT be described as preserving local patches.

#### Scenario: Repair after stock update
- **WHEN** source and personal/project runtime patches are restored
- **THEN** full gates pass against the aligned lock, private settings/auth/instructions are preserved and restart/live-test limits are reported
