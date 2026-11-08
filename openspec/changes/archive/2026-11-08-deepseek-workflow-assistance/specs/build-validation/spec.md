## ADDED Requirements

### Requirement: Workflow assistance has an offline real-SDK gate
The mandatory gate MUST test DeepSeek-only defaults, explicit mode restore, generic skill hydration in provider payloads, trusted retrieval bounds, actual codemode nested execution, privacy diagnostics and bounded corrective feedback using the pinned Pi SDK and local fake providers without production credentials or network calls. Installer/source deployment contracts MUST cover the extension.

#### Scenario: Gate runs without real model credentials
- **WHEN** npm test runs on a clean or installed dependency target
- **THEN** workflow checks exercise actual SDK lifecycle transitions and tool execution with finite deadlines and no external classifier/model request
