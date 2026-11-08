# Why

The operator approved activating the tested terminal workflow in the installed personal Pi, with scoped backup, preservation checks and offline host validation.

# What Changes

- Replace only ~/.pi/agent/agents/terminal.md from committed source 9746278.
- Replace only the delegation section of personal APPEND_SYSTEM.md from the same source, preserving all other bytes.
- Back up both files with modes/hashes, validate bytes/preservation and run npm test -- --agent ~/.pi/agent. Restore both on failure.

# Capabilities

## Modified Capabilities
None. Deployment only, skip_specs: true; contracts already implemented by clarify-terminal-nonproduction-edits and terminal-default-execution-routing.

# Impact

No dependency/settings/credentials/maintenance changes, SSH, real model calls or automatic restart. Existing running sessions may retain old instructions; a new Pi process is required.
