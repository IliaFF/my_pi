## ADDED Requirements

### Requirement: New eager terminal survives legacy session reopening
The loadout restorer MUST preserve an active newly registered subagent tool when the reopened branch has never declared or removed that name. Explicit historical removal MUST remain effective. Other deferred tools and historical prefix behavior MUST remain unchanged.

#### Scenario: Install then reload a legacy session
- **WHEN** a legacy session that predates terminal is reopened with an active eager subagent registration
- **THEN** the parent can discover/call that tool without rewriting old declarations or exposing other deferred tools

#### Scenario: Explicit removal
- **WHEN** the reopened branch previously recorded removal of subagent
- **THEN** restoration keeps it inactive
