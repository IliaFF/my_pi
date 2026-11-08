# Scoped deployment

Full install is deliberately avoided because preservation mode can still align unrelated package versions, refuses an old terminal profile and does not merge private APPEND. Guard that the installed profile equals the known pre-change Git version and the old delegation section equals its known Git baseline. Reject symlink destinations/parents and unexpected bytes before writes.

Prepare the new APPEND by replacing exactly the block from '# Long-lived delegation' up to '# Tracked project work'. Preserve private prefix/suffix byte-for-byte, including existing unrelated TODO/Firstmate differences. Do not copy personal content into Git. The new profile is byte-identical to the committed source.

Use a private two-file backup with SHA256 and modes. Verify unchanged input immediately before applying; copy each candidate over its target, preserving original modes. Two files are not one atomic transaction. On a write/check/gate failure restore both original files and verify hashes and modes; if restoration fails report the blocker rather than claim rollback.

Checks are byte equality, outside-block preservation, unchanged hashes of non-secret adjacent configs, actual SDK prompt assembly and full offline host gate. No live DeepSeek/child execution. The author has access to checks and backup, so no independent control or sandbox is claimed. Leave installed maintenance and dependency tree unchanged. Restart remains a user action after success.
