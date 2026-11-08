# Why

The operator wants GPT to plan, write production code and accept results, while DeepSeek terminal handles routine non-production execution, including short tasks. The previous multi-context-only threshold prevents this division of work.

# What Changes

- Make terminal the default executor for coherent non-production assignments regardless of length, with GPT retaining planning, production code and acceptance.
- Keep the multi-context threshold for other delegation, and preserve operational authorization, resource approval, continuity and evidence duties.
- Align the managed profile, standing instructions, portable usage and root project AGENTS; extend offline SDK coverage.

# Capabilities

## Modified Capabilities
- `general-agent-policy`: terminal default routing exception and parent ownership.
- `portable-user-stack`: terminal supports short routine assignments without widening production authority.

# Impact

Only instruction sources, documentation, existing SDK/unit checks and OpenSpec. Root AGENTS is outside the pi-build Git repo and is reviewed separately. No runtime installation, actual DeepSeek/model calls, SSH or external services are part of this change.
