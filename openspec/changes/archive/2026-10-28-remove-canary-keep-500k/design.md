# Design

Remove rather than disable Canary so clean installations cannot issue recall probes. Keep auto-ultra-compact and context-fold unchanged. Preserve real SDK faux-provider coverage for native smaller-window compaction; existing auto-ultra tests cover the exact 500k threshold and continuation lifecycle. Release validation rejects Canary dependencies, config and patch. No new dependency or runtime setting.

Pipeline: managed source → absence regression → remove Canary → isolated npm gate → archive, commit and push. No production deployment.
