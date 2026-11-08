# Why

The terminal profile currently prohibits all source edits. The operator permits explicitly assigned non-production code and edits, but forbids product code even in development branches.

# What Changes

- Replace the blanket source-edit prohibition with a non-production-only boundary in the profile and parent usage instructions.
- Keep parent planning/acceptance, global delegation authorization and all operational restrictions unchanged; allow the standard Pi tools read, bash, edit, write, grep, find and ls as additionally requested.
- Verify policy delivery through the existing offline SDK fixture and run the full gate.

# Capabilities

## Modified Capabilities
- `portable-user-stack`: terminal non-production editing boundary and parent handoff duties.

# Impact

Only managed profile, parent instructions, portable-stack documentation and existing SDK test. No runtime deployment, new agents, SSH, installation, network/model calls or production edits. Local commit approved by the operator.
