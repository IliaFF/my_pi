## ADDED Requirements

### Requirement: Operating help is not advertised before delegation
Fresh sessions MUST omit the Herdr operating skill metadata, model catalog and detailed routing instructions from initial model context. The skill MUST remain on disk and explicitly invocable. Unrelated tool discovery MUST NOT activate Herdr instructions. Herdr discovery MUST retain original callable schemas and operating guidance.

#### Scenario: Unrelated coding and discovery
- **WHEN** a fresh session loads context or remote tools without requesting Herdr
- **THEN** neither Herdr routing instructions nor its operating skill advertisement appears in the prompt

#### Scenario: Explicit help remains available
- **WHEN** the Herdr skill is loaded by Pi
- **THEN** it is marked disabled for model invocation, while its file remains readable and its explicit skill command remains available
