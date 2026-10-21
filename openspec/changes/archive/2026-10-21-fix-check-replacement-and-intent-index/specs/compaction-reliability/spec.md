## ADDED Requirements

### Requirement: Index user intents exclude owned control envelopes
Both soft-fold and hard-compaction indexes MUST exclude the build's exact restore-control envelope from User intents and index the substantive task body of its exact queue envelope instead of the queue heading. Ordinary user text, recovery source contents and other index fields MUST remain unchanged. The context-fold patch MUST be versioned and exercised in the mandatory gate without model or credential calls.

#### Scenario: Restore and queued task
- **WHEN** history contains a normal user request, the owned restore prompt and the owned queue prompt
- **THEN** the two index extractors preserve the request and task-body first line, not the restore line or queue heading

#### Scenario: Similar ordinary text
- **WHEN** a user discusses restoration or quotes a queue heading without the full owned envelope
- **THEN** the ordinary first-line intent remains indexed

#### Scenario: Multiline limitation remains explicit
- **WHEN** a request has its restriction on a later line
- **THEN** a characterization test documents first-line truncation; the build MUST NOT claim that this change preserves the later restriction in User intents
