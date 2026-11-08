## Why

User-session experiments show that shorter prompts alone do not reliably make DeepSeek load relevant skills. Explicit loading helps, while Jev can miss skills and over-select tools. The user authorizes implementing, globally installing and publishing a bounded assistant mechanism, defaulting on only for DeepSeek, with detailed private diagnostics for later real-use evaluation.

## What Changes

- Restore the source-owned `jev-review` extension to the managed installed stack and extend it rather than run competing reviewers.
- Default to `auto`: active for DeepSeek model IDs only, with explicit session-local on/off/auto controls and preserved legacy explicit choices.
- Discover skills from Pi's actual resource catalog; use Jev plus verified explicit requirements to supply complete selected instructions before generation. Preserve ordinary skill discovery on classifier failure; never claim missing references were loaded.
- Provide small scoped lexical retrieval from trusted active project context and local skill references without a new service, embeddings, cross-project history ingestion or permission escalation.
- Prefer codemode for useful multi-tool orchestration and bounded result processing. Do not force it for one simple call; retain per-call error/permission handling and additive native tool discovery.
- Review rules against scoped evidence with explicit uncertainty, keep the existing single-correction boundary, and prohibit feedback from authorizing new destructive/external actions.
- Record bounded, owner-private, versioned diagnostics: activation, routing, full-load coverage, sources, direct/nested tool use, review findings, failures and usage. No credentials, thought text or full conversation/file dumps.
- Validate with real offline Pi SDK lifecycle/provider-payload and actual codemode/nested-tool scenarios, then the full build gate, backup/install verification and source-only push.

## Capabilities

### New Capabilities
- `deepseek-workflow-assistance`: model-scoped skill/context hydration, codemode guidance, rule feedback and private diagnostics.

### Modified Capabilities
- `portable-user-stack`: deploy the managed workflow extension with backup/rollback and no private runtime in Git.
- `build-validation`: require offline lifecycle, gating, privacy and actual nested-tool regression coverage.

## Impact

Source scope: local-extensions/jev-review, installer/manifest and mandatory tests, portable docs/specs. No core fork, dependency upgrades, new service, SSH changes or global user-prompt replacement. Non-DeepSeek models retain their behavior unless explicitly opted in. Live experimental spending remains within the previously approved total 2 USD; offline fake providers are the required gate. Review and tests remain executor-accessible, not independent controls.
