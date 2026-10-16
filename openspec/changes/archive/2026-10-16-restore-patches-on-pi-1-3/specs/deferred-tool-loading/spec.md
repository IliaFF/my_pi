## ADDED Requirements

### Requirement: Updated Preview retains deferred exposure
The approved Preview 0.23.0 baseline MUST register preview_export with native deferred exposure without changing its schema or executor.

#### Scenario: Fresh Preview after stock package update
- **WHEN** the versioned patch is applied to a pristine Preview 0.23.0 installation
- **THEN** the actual SDK deferred-tool regression passes with core 1.3.0 and safe discovery remains additive
