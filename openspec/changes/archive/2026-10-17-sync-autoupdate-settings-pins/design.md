# Design
## Trusted settings preparation
Derive expected configs/settings.json exclusively from baseline bytes and trusted current/target dependency maps. Replace only npm:<existing name>@<current exact version> in string package entries or object source fields. Leave floating versions, unknown packages, resource filters and all unrelated settings untouched. Preserve original bytes when there is no change. Stage expected settings before invoking the agent, and require exact bytes and executable-bit equality at acceptance. The narrow scope exception is always paired with this validation, as manifest exceptions already are.

## Rejection diagnostics
A newly created active openspec/changes/autoupdate-<same fingerprint>/ file is never acceptable output. If encountered by scope validation, reject as incomplete/unarchived repair and direct the operator to private logs for blockers. Never archive automatically, accept incomplete work, forward arbitrary model output or reset attempts.

## Validation and risk
Use temporary fixtures and the real controller orchestration with mocked external boundaries to prove expected settings reach repair before startup, unauthorized edits stop before gate/publication, and the original failure reports incompleteness. Test string/object/scoped specs, floating/unknown entries, filters, version mismatch, removal/reorder and executable mode. Retain all existing protected-path, OAuth, sandbox, gate and publication tests. Full npm test required; no live success claim. Deployment remains separately approved because installed controller is root-owned outside checkout.
