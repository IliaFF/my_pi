## Why
OpenSpec is pinned and globally installed at 1.14.1; stable 1.14.3 removes the vulnerable braces dependency, hardens glob artifact paths and fixes validation hangs. The user approved updating the source tooling and installed CLI.

## What Changes
Update the exact development dependency and lockfile to 1.14.3, validate the existing build and replace only the global OpenSpec CLI after backing it up. Update the documented tooling audit limitation using measured results.

## Capabilities
No behavior/specification changes; tooling-only update, skip_specs: true. Existing build-governance and build-validation contracts remain applicable.

## Impact
package.json, package-lock.json and diagnostics documentation; global @fission-ai/openspec only. No Pi runtime, credentials, personal settings, VPS, push or paid provider calls. Existing regression suite covers this version-only dependency update; no fabricated failing bug regression.
