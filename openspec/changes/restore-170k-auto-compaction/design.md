## Context
Native compaction is already enabled. The local extension defaults were raised to 500k. Restore both the effective cap and its matching token threshold, retaining their 100% ratio.

## Decisions
Change defaults only; preserve environment overrides, smaller-window native protection, 12k retention, deterministic context-fold ownership and manual non-continuation. Exercise 169999/170000 boundaries before fixing code and retain real SDK integration in npm test.

## Risks
Compaction occurs earlier on large models, as requested. Local main contains prior merged work not yet pushed; push is fast-forward and preserves that history. No runtime deployment.
