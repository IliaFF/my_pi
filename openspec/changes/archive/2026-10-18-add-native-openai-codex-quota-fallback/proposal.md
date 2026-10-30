# Native OpenAI Codex-account quota fallback

## Why
The old usage extension does not recognize native openai models unless a legacy model happens to share the same ID. The user explicitly enabled a separate Codex OAuth login to read quota while keeping native inference.

## What Changes
- Add a versioned package patch that reads only real official Codex OAuth model credentials for native openai quota.
- Label the result as Codex account quota, not verified native app quota; unavailable auth never supplies fabricated numbers.
- Keep inference, settings, dependencies and all other provider behavior unchanged. Reject proxy origins and redirects at the credential boundary.
- Add isolated regression and actual Pi SDK lifecycle/render checks to the mandatory gate.

## Capabilities
### New Capabilities
- `native-openai-quota-fallback`: explicitly labeled account-quota fallback through separate Codex OAuth.
### Modified Capabilities
- `build-validation`: mandatory offline package/SDK coverage for quota fallback.

## Impact
Patch for @beyona/pi-zai-usage 1.1.0, manifest integrity, package replay, stack probe and new SDK regression. Scoped approved deployment after backup; no live requests or model switch by the assistant.
