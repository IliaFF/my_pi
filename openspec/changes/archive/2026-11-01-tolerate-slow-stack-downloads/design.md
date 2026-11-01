## Decision
Use the existing downloader and raise its curl max-time from 240 to 540 seconds. Keep the surrounding command timeout at 600 seconds, the 20-second connection timeout, HTTPS restriction, size limit and SHA-256 validation. No retry/resume abstraction or new options.

## Verification
First add a failing assertion to the actual installStack mocked-run bootstrap test, then change the shared curl invocation and run the complete npm test. Existing tests retain checksum mismatch, incomplete store refusal, no launcher publication on failure and no agent launches. The new test checks command arguments, not live network availability.

## Deployment
Review the retained incomplete store before moving it to a separate retained diagnostic path. Run the unchanged top-level installer with preservation and backup; it runs host gates and rolls back on failure. Do not delete a possible runtime. Budget an additional 10–20 minutes for slow external downloads. A 540-second deadline can still fail on slower connections.
