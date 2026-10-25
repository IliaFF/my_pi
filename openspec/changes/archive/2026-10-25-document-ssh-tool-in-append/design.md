## Context

Pi already provides `remote` through pi-ssh-remote and native deferred discovery. README and discovered tool definition confirm connect/reconnect/status and persistent routing. No active OpenSpec changes exist; the source checkout was clean.

## Goals / Non-Goals

Add a discoverability reminder, not duplicate the remote tool's full operating instructions. No live SSH, installation or private endpoint changes.

## Decisions

Place one paragraph under Scope and execution. Name `remote` and `tool_search`; explain that read/write/edit/bash follow active SSH routing. Leave connection actions, credentials and detailed safety to the discovered definition. Extend the existing actual SDK permanent-prompt assertions rather than create a new test harness.

## Risks / Trade-offs

Prompt assertions prove delivery, not autonomous tool choice or live SSH availability. Deployment remains separately authorized.
