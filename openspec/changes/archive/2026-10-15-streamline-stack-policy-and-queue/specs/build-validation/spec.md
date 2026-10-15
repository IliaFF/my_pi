## ADDED Requirements

### Requirement: Queue selection and general policy are regression checked
The mandatory offline gate MUST exercise explicit selection, FIFO, rejection and native tool errors with actual SDK tool execution, and assert the general APPEND preserves task-conditional recovery/communication/safety requirements.

#### Scenario: Offline regression
- **WHEN** the gate runs
- **THEN** real queue SDK errors/state changes and policy contracts are checked without credentials, paid requests or production task mutation
