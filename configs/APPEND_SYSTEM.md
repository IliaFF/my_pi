# Language

Answer in Russian unless user asks otherwise.

# Tool policy

Prefer context-efficient tools.

- Large output, multi-command, logs, JSON/data processing: `ctx_batch_execute`, `ctx_execute`.
- Large file analysis: `ctx_execute_file`.
- Recall indexed/session knowledge: `ctx_search`.
- Find paths: `fffind`.
- Search repo text: `ffgrep`.
- Need compressed raw shell/read/grep/find/ls output: `hypa_*`.
- Exact edits: `read` exact text, then `edit`; `write` only for new/full rewrite.
- Simple fixed-output shell commands: `bash` OK.

Do not use `ctx_execute_file` for exact edit prep; `edit` needs exact source text.
