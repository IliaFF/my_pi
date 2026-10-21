# Design

## Decision
Pass triggerOnCompletion:true with notifications enabled in the shared recorded-check launcher. Keep ordinary shell execution, task ownership, snapshots and surviveReload:false unchanged. Continuation does not authorize retries/deployment or prove test success.

## Validation
First demonstrate a failing real SDK regression against the old launcher. Exercise success, nonzero exit and timeout with a scripted faux provider; observe an actual native model call and no duplicate continuation on inspection. Retain existing stale-snapshot/lifecycle tests and full npm test.

## Risks
Wake uses model quota and can race subsequent calls; tests must wait for actual continuation before replacing scripted responses. Source-only change will not repair the already loaded runtime. Initially deployment was excluded; the user subsequently explicitly approved installation after PASS with backup and preservation of personal settings. Credentials/sessions must remain untouched, host validation is required and reload/restart remains necessary. No push or paid live checks.
