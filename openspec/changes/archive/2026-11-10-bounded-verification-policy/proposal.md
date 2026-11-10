## Why

Borrow the small useful parts of deepseek-stack without duplicate state, automatic delegation or model changes: explicit checks and a stop for repeated failed fixes.

## What Changes

- Add two short model-independent verification paragraphs to the existing APPEND execution section.
- Exercise their presence through the real SDK prompt assembly.
- After the mandatory gate passes, append only the same paragraphs to the personal runtime APPEND with a private backup and byte-preservation check.

## Capabilities

### Modified Capabilities
- `general-agent-policy`: bounded verification and repeated-failure diagnosis.

## Impact

Only APPEND source, existing SDK regression, specs and change evidence. No dependencies, provider/model/reasoning settings, new journal, agents, SSH or paid calls. Runtime APPEND application is explicitly authorized by the user; no full installer.
