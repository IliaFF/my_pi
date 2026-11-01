## Context

The candidate already pins nineteen of twenty requested packages to their target versions. Browser-use alone needs 0.1.34. Existing versioned patches target unchanged package releases. Root tooling, tests, scripts, configuration and existing specification history are protected.

## Goals / Non-Goals

**Goals:** reproduce all exact authorized pins, retain local contracts, validate the actual installed packages with the existing credential-free mandatory gate.

**Non-Goals:** features, new dependencies, lifecycle enablement, provider requests, deployment, commits, CI execution or changes to protected files.

## Decisions

Use a narrowly scoped exact pin update and lock-only npm resolution with scripts disabled and legacy peer resolution. Install using `npm ci --ignore-scripts --legacy-peer-deps` in both root and npm directories. Retain existing package names, scripts and allowScripts. Let the existing gate apply and verify existing versioned patches in isolated runtime dependencies.

No new behavioral regression is introduced: this is release alignment rather than a behavior change. The unchanged full gate supplies existing unit, real SDK, patch and startup regressions. If satisfying it requires protected changes, stop and document the blocker rather than weakening assertions.

## Risks / Trade-offs

An upstream browser release or transitive change could break startup or existing package contracts. Review lock scope and upstream release metadata, then run the full gate. Offline success does not prove browser/SSH/provider live functionality.

## Migration Plan

Update only the existing npm pin/lock; run clean installs and the mandatory gate. Archive only after full PASS and completed tasks into `openspec/changes/archive/2026-11-01-autoupdate-9bdad45538ed/`, without modifying canonical specs/history. The controller owns commits and acceptance. Reverting the pin/lock is the source-only rollback; no runtime is deployed.

## Open Questions

None. CI and live external integration remain unverified here.
