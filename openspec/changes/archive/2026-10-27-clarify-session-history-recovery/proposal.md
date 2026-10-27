## Why
Root TODO 84ef948ee404 asks for session-history recovery when context is unclear after compaction. Existing TODO reminders, focused-history policy and context-fold recall already exist. A synthetic SDK probe confirms that recall searches foldable blocks, not user messages; a second-line user constraint is absent from the deterministic first-line index and from recall. The original remains in the session ledger. Existing wording does not explain that fallback.

## What Changes
- Clarify the existing permanent recovery paragraph: resolve missing agreements through bounded active-branch session history, not guesses or whole-session dumps; ask if evidence is insufficient.
- Retain TODO authority, recall tools, summary owner, thresholds and continuation unchanged.
- Extend existing real-SDK tests to characterize user-message recall limits and verify raw-ledger recovery and effective instructions.

## Capabilities
### Modified Capabilities
- `general-agent-policy`: explicit sensitive, bounded session-ledger fallback for unclear details.
- `build-validation`: actual SDK recovery characterization without credentials or real sessions.

## Impact
Source APPEND and existing tests only. No new tool/dependency/store, runtime settings, Canary reinstall, reload, server access or publication. Runtime deployment requires separate approval.
