# Verification — 2026-10-28

## Installation
- npm registry `https://registry.npmjs.org/`: `latest=1.4.0`; exact official `@earendil-works/pi-coding-agent@1.4.0`, Node 24.18.0.
- `npm install --prefix /root/.local/share/pi-demo/runtime --save-exact --ignore-scripts --no-audit --no-fund ...@1.4.0`: exit 0, 121 packages. One upstream deprecation warning: node-domexception@1.0.0. No lifecycle scripts, global install or current runtime updates.
- Runtime tree/lock outside Git. Separate agent, HOME, workspace and launcher all chmod 700. Initial target conflict checks passed; no existing files overwritten.
- Final launcher uses package.json `bin.pi` entry `dist/bundle/cli.js`, matches documented template byte-for-byte; `sh -n` PASS. Initial smoke also exercised shipped unbundled `dist/cli.js`; this was replaced with official bin entry before final probes.

## Actual demo probes
- `pi-demo --version`: 1.4.0. `--offline --help`: PASS; `list`: No packages installed.
- Actual installed SDK, offline plus existing `scripts/no-network.cjs`: DefaultResourceLoader reload and real createAgentSession/SessionManager.inMemory PASS. Exactly builtin:llama.cpp, builtin:codemode, builtin:tool-search, builtin:mcp. No extension errors, skills, prompts, custom themes, context files, SYSTEM/APPEND override. Active tools exactly read/bash/edit/write; empty auth object and no messages. Probe script `/tmp/pi-demo-probe.mjs` outside Git.
- Actual launcher RPC from original source cwd: get_state idle, get_messages empty; get_commands exactly llama,mcp; no agent_start or extension_error. Safe RPC bash (not a model request) confirmed demo cwd/HOME/agent and absence of inherited API key, NODE_OPTIONS and session directory override. Parent values were deliberately poisoned with non-secret sentinels. Graceful stdin EOF exit 0, stderr empty. Probe `/tmp/pi-demo-rpc-check.py` outside Git.
- Actual PTY interactive startup, `--offline --no-session --verbose --tui-mode regular`: Pi v1.4.0 header reached terminal; Ctrl-D exited 0 without submitting text. This checks terminal lifecycle, not human visual quality or default fullscreen rendering. Transcript remains `/tmp/pi-demo-tui.txt`, not in Git.
- Offline TUI warns fd/ripgrep missing and no models available. Existing current runtime helper binaries deliberately not reused. Automatic online helper downloads, provider login and model calls NOT checked. Core default tools available.

## Current runtime preservation
`sha256sum --check /tmp/pi-demo-baseline.sha256`: all five PASS — current agent settings.json, auth.json, npm/package.json, npm/package-lock.json and global Pi package.json. Current global CLI remains 1.3.0, personal SDK remains 1.4.0. No current config/auth copied. Canary pending and SSH blocked are untouched.

## Source gate
- `npm test`: exit 0, 18/18 PASS, actual source-locked SDK integrations and RPC smoke; no use of differing personal dependencies. Report test-results/results.json stays ignored.
- `openspec validate install-isolated-pi-demo --strict --no-interactive`: PASS (skip_specs tooling/docs; no source behavior changes).
- Full owned new files reviewed; only docs/pi-demo.md and this change are selected for commit. Pre-existing TODO changes, .pi/tasks logs and Canary plan excluded. Final whitespace and strict validation repeated after evidence updates.
- No bug fix: failing regression not applicable. No production deployment/rollback, archive, push or CI job performed. CI NOT verified.

## Limits
Configuration isolation is not an OS sandbox. The demo remains a root process with access to other root-readable files. No provider credentials were copied; absence of model calls does not prove live login, availability, model quality or performance. npm transitive lock is local, not a checked-in upstream release bundle. No additional extensions, updater, credentials migration or convenience options were added.
