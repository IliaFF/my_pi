# Design

Track names mentioned by both toolsAdded and toolsRemoved while reconstructing the historical set. Preserve active subagent only when it has never been mentioned. Do not resurrect an explicitly removed subagent or activate other deferred tools. The registered tool/current default activation still decides whether an unseen subagent is active. No new setting or wrapper.

Real SDK fixture opens an older transcript with a newly registered eager subagent stub, asserts availability, records explicit removal, then reopens and asserts removal persists. The stub must never execute. Existing real pi-subagents faux-provider lifecycle and fresh/full runtime RPC coverage remain mandatory. Deploy the source fix only after npm test/review and back up the existing leaf before replacing; rerun source/runtime bytes and no-prompt smoke. One authorized live sentinel is separate from offline evidence and proves only that one request returned.
