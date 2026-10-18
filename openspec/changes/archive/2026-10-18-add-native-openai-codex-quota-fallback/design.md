# Design

## Decision
Reuse the old extension and Codex usage endpoint. Native openai selects the Codex account meter regardless of model-ID equality. Only actual openai-codex model objects are eligible as credential sources for this fallback; never relabel the native model for auth. Require OAuth and official HTTPS chatgpt.com model/resolved origins. Reject redirects. Native API-key auth must not be presented as native subscription allowance; the meter is explicitly a separate Codex account source in either case.

## State and safety
Do not reuse native-view numeric data across status refreshes; re-resolve Codex auth. Preserve existing failure backoff, clear stale data on unavailable/error, reject late results after a newer status lifecycle and check the effective Codex auth again before publishing a response. Clear generation on shutdown. Native status and all-provider view label the Codex account source, with an unavailable message when no valid source exists. Account equality with native auth is not established and must not be claimed.

## Non-goals
Native app limits, browser cookies, token exchange, resetting quota, endpoint probing, inference requests and model changes. No new dependency/config option. Pin the existing portable package source to 1.1.0 to match the versioned patch and existing lock. Existing event-driven refresh cadence is retained, but native view does not reuse previous quota readings on a status event.

## Validation and rollout
First demonstrate failure against stock 1.1.0. Use synthetic auth and mocked HTTP in an isolated directory; actual SDK loader/runner lifecycle and real footer rendering. Cover disjoint IDs, absent/rejected/changed auth, origins, redirects, unsupported providers, races and shutdown. Full npm test before acceptance and again against installed package after a scoped backup/copy; preserve private settings/auth bytes. Offline checks do not establish live quota accuracy or TUI appearance.
