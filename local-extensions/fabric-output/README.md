# Fabric semantic output

Global Pi extension, enabled through `~/.pi/agent/extensions/fabric-output.json`. It does not replace Fabric or Pi storage/retrieval.

Middleware reads byte-exact native artifacts created by Fabric (`/tmp/pi-fabric-output-*/output.txt`) or nested Pi Bash (`/tmp/pi-bash-*.log`), applies deterministic test/build/grep reducers, and returns smaller result while preserving native path. Exact lazy retrieval uses existing `pi.read`/`pi.grep` through `fabric_exec`.

```json
{
  "enabled": true,
  "thresholdBytes": 32768,
  "maxReturnedChars": 24576
}
```

Validation: `node ~/.pi/agent/extensions/fabric-output/core.test.mjs`.

`reducers.mjs` adapts MIT code from `pi-rtk-optimizer@0.9.0`; see `LICENSE.RTK`. Images, missing artifacts, and outputs without native artifacts remain unchanged. Nested exit codes are not exposed by Fabric trace; marker reports outer outcome.
